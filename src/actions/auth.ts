'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { clearAdminSession, createAdminSession } from '@/lib/admin-auth';

export async function loginAdmin(formData: FormData) {
  try {
    const user = formData.get('user') as string;
    const pass = formData.get('pass') as string;

    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    
    if (!settings) {
      return { success: false, error: 'Error del sistema' };
    }

    const passwordMatches = settings.adminPass.startsWith('$2')
      ? await bcrypt.compare(pass, settings.adminPass)
      : pass === settings.adminPass;

    if (user === settings.adminUser && passwordMatches) {
      if (!settings.adminPass.startsWith('$2')) {
        await prisma.systemSetting.update({
          where: { id: settings.id },
          data: { adminPass: await bcrypt.hash(pass, 12) },
        });
      }
      await createAdminSession(settings.adminUser);
      return { success: true };
    } else {
      return { success: false, error: 'Credenciales inválidas' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function logoutAdmin() {
  await clearAdminSession();
}
