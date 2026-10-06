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

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        user: {
          role: 'ADMIN',
          isActive: true,
        },
      },
    });
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


export async function sendUserPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string = '/'
) {
  await requireTenantFeature('push').catch(() => {});

  try {
    const keys = await getOrGenerateVapidKeys();
    if (!keys.publicKey || !keys.privateKey) {
      console.warn('VAPID keys could not be obtained, skipping user push notification');
      return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        user: {
          isActive: true,
        },
      },
    });

    if (!subscriptions.length) return;

    const payload = JSON.stringify({ title, body, url });

    await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error('Error sending user push notification:', error);
          }
        }
      })
    );
  } catch (error) {
    console.error('Failed to send user push notification', error);
  }
}
