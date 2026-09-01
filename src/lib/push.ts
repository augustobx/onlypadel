import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { requireTenantFeature } from '@/lib/features';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:admin@psp.local';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function sendAdminPushNotification(title: string, body: string, url: string = '/admin/dashboard') {
  await requireTenantFeature('push');
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification');
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany();

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
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
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
