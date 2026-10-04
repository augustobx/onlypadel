import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { requireTenantFeature } from '@/lib/features';
import { getOrGenerateVapidKeys } from '@/lib/vapid';

export async function sendAdminPushNotification(title: string, body: string, url: string = '/admin/dashboard') {
  await requireTenantFeature('push').catch(() => {});
  
  try {
    const keys = await getOrGenerateVapidKeys();
    if (!keys.publicKey || !keys.privateKey) {
      console.warn('VAPID keys could not be obtained, skipping push notification');
      return;
    }

    const subscriptions = await prisma.pushSubscription.findMany();
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({ title, body, url });

    const promises = subscriptions.map(async (sub: any) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSub, payload);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log('Subscription has expired or is no longer valid: ', error);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Failed to send admin push notifications', error);
  }
}
