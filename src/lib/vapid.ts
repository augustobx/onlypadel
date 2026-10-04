import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let cachedVapidKeys: { publicKey: string; privateKey: string; subject: string } | null = null;

/**
 * Obtiene las llaves VAPID del entorno o de la base de datos (tabla Setting).
 * Si no existen en ningún lado, las genera automáticamente con webpush y las persiste en la base de datos
 * para que funcionen de inmediato en cualquier dispositivo sin requerir configuración manual.
 */
export async function getOrGenerateVapidKeys(): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  if (cachedVapidKeys) {
    return cachedVapidKeys;
  }

  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:admin@onlypadel.nanoapps.ar';

  if (envPublic && envPrivate && envPublic.trim() !== '' && envPrivate.trim() !== '') {
    cachedVapidKeys = {
      publicKey: envPublic.trim(),
      privateKey: envPrivate.trim(),
      subject,
    };
    try {
      webpush.setVapidDetails(subject, cachedVapidKeys.publicKey, cachedVapidKeys.privateKey);
    } catch {}
    return cachedVapidKeys;
  }

  // Buscar en la tabla Setting
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['vapid_public_key', 'vapid_private_key'] },
      },
    });

    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    if (map['vapid_public_key'] && map['vapid_private_key']) {
      cachedVapidKeys = {
        publicKey: map['vapid_public_key'],
        privateKey: map['vapid_private_key'],
        subject,
      };
      try {
        webpush.setVapidDetails(subject, cachedVapidKeys.publicKey, cachedVapidKeys.privateKey);
      } catch {}
      return cachedVapidKeys;
    }

    // Si no existen en DB, generamos un par VAPID estándar nuevo
    const newKeys = webpush.generateVAPIDKeys();
    
    // Guardar en Setting de forma persistente
    await prisma.setting.createMany({
      data: [
        { key: 'vapid_public_key', value: newKeys.publicKey },
        { key: 'vapid_private_key', value: newKeys.privateKey },
      ],
    }).catch(() => {});

    cachedVapidKeys = {
      publicKey: newKeys.publicKey,
      privateKey: newKeys.privateKey,
      subject,
    };

    try {
      webpush.setVapidDetails(subject, cachedVapidKeys.publicKey, cachedVapidKeys.privateKey);
    } catch {}

    return cachedVapidKeys;
  } catch (error) {
    console.error('Error obteniendo o generando llaves VAPID:', error);
    // Fallback en memoria si la BD no respondiera
    const fallbackKeys = webpush.generateVAPIDKeys();
    cachedVapidKeys = {
      publicKey: fallbackKeys.publicKey,
      privateKey: fallbackKeys.privateKey,
      subject,
    };
    return cachedVapidKeys;
  }
}

export async function getVapidPublicKey(): Promise<string> {
  const keys = await getOrGenerateVapidKeys();
  return keys.publicKey;
}
