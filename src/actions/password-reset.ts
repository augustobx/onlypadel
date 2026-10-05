'use server';

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { resolveTenantContext } from '@/lib/tenant-context';
import { normalizePhoneNumber } from '@/lib/phone';

export async function requestPasswordReset(identifier: string) {
  const cleanId = (identifier || '').trim();
  if (!cleanId) {
    return { success: false, error: 'Ingresá tu correo electrónico, DNI o teléfono.' };
  }

  try {
    const cleanDni = cleanId.replace(/\D/g, '');
    const cleanPhone = normalizePhoneNumber(cleanId);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { dni: cleanId },
          ...(cleanDni ? [{ dni: cleanDni }] : []),
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          { phone: cleanId }
        ]
      }
    });

    if (!user) {
      // Por seguridad informativa indicamos mensaje genérico o si no existe
      return { success: false, error: 'No encontramos ninguna cuenta con esos datos.' };
    }

    if (!user.email || user.email.endsWith('@cliente.onlypadel') || user.email.endsWith('@local.onlypadel')) {
      return {
        success: false,
        error: 'Tu cuenta no tiene un correo electrónico válido registrado. Por favor comunicate con la administración del club para restablecer tu clave.'
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 horas

    // Guardar en tabla Setting para persistencia segura
    const key = `reset_token_${token}`;
    const value = JSON.stringify({ userId: user.id, email: user.email, expiresAt });

    await prisma.setting.create({
      data: {
        tenantId: user.tenantId,
        key,
        value,
      }
    });

    // Obtener contexto de tenant para el link
    let appUrl = 'https://onlypadel.nanoapps.ar';
    try {
      const tenant = await resolveTenantContext();
      if (tenant?.hostname) {
        appUrl = `https://${tenant.hostname}`;
      }
    } catch {}

    const resetLink = `${appUrl}/recuperar-clave?token=${token}`;

    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
    const clubName = settings?.clubName || 'OnlyPadel';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0;">🎾 ${clubName}</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Recuperación de contraseña</p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hola <strong>${user.name || 'Jugador'}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 12px;">
            Este enlace es personal y tiene una validez de <strong>2 horas</strong>.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
            Restablecer mi contraseña
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center;">
          Si no realizaste esta solicitud, podés ignorar este correo; tu contraseña actual continuará siendo segura.
        </p>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

        <div style="text-align: center; color: #cbd5e1; font-size: 11px;">
          ${clubName} • Sistema OnlyPadel
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Recuperá tu contraseña - ${clubName}`,
      html,
    });

    return {
      success: true,
      message: `Enviamos un enlace de recuperación a ${user.email}. Revisá tu bandeja de entrada o spam.`
    };

  } catch (error: any) {
    console.error('Error en requestPasswordReset:', error);
    return { success: false, error: 'Ocurrió un error al procesar la solicitud. Intentá nuevamente.' };
  }
}

export async function validateResetToken(token: string) {
  if (!token) return { valid: false, error: 'Token no provisto.' };

  try {
    const record = await prisma.setting.findFirst({
      where: { key: `reset_token_${token}` }
    });

    if (!record) {
      return { valid: false, error: 'El enlace de recuperación es inválido o ya fue utilizado.' };
    }

    const data = JSON.parse(record.value) as { userId: string; email: string; expiresAt: number };
    if (Date.now() > data.expiresAt) {
      // Eliminar token expirado
      await prisma.setting.delete({ where: { id: record.id } }).catch(() => {});
      return { valid: false, error: 'El enlace de recuperación ha expirado. Por favor solicitá uno nuevo.' };
    }

    return { valid: true, email: data.email };
  } catch (error) {
    return { valid: false, error: 'Token inválido.' };
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (!token || !newPassword || newPassword.length < 6) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    const record = await prisma.setting.findFirst({
      where: { key: `reset_token_${token}` }
    });

    if (!record) {
      return { success: false, error: 'El enlace de recuperación es inválido o ya fue utilizado.' };
    }

    const data = JSON.parse(record.value) as { userId: string; email: string; expiresAt: number };
    if (Date.now() > data.expiresAt) {
      await prisma.setting.delete({ where: { id: record.id } }).catch(() => {});
      return { success: false, error: 'El enlace ha expirado. Por favor solicitá un nuevo enlace.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar contraseña del usuario
      await tx.user.update({
        where: { id: data.userId },
        data: { password: hashedPassword }
      });

      // 2. Eliminar el token usado
      await tx.setting.delete({
        where: { id: record.id }
      });

      // 3. Cerrar sesiones previas del usuario por seguridad
      await tx.userSession.deleteMany({
        where: { userId: data.userId }
      }).catch(() => {});
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error in resetPasswordWithToken:', error);
    return { success: false, error: 'No se pudo actualizar la contraseña. Intentá nuevamente.' };
  }
}
