import { prisma } from '@/lib/prisma';
import { sendUserPushNotification } from '@/lib/push';

export type UserNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
};

export async function createUserNotification(input: UserNotificationInput) {
  const notification = await prisma.communityNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      linkUrl: input.linkUrl ?? null,
    },
  });

  // El registro interno es la fuente de verdad. El push es un canal adicional
  // y nunca debe impedir que se cree la notificación dentro de OnlyPadel.
  await sendUserPushNotification(
    input.userId,
    input.title,
    input.body || '',
    input.linkUrl || '/comunidad/notificaciones'
  );

  return notification;
}
