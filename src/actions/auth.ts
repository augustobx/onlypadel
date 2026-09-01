'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { clearAdminSession, createAdminSession } from '@/lib/admin-auth';
import { TenantResolutionError } from '@/lib/tenant-context';

export async function loginAdmin(formData: FormData) {
  try {
    const identity = String(formData.get('user') || '').trim().toLowerCase();
    const password = String(formData.get('pass') || '');
    if (!identity || !password) return { success: false, error: 'Credenciales inválidas' };
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true, OR: [{ email: identity }, { dni: identity }, { name: identity }] },
    });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) return { success: false, error: 'Credenciales inválidas' };
    await createAdminSession(user.id);
    return { success: true };
  } catch (error) {
    if (error instanceof TenantResolutionError && error.message === 'TENANT_SUSPENDED') {
      return { success: false, suspended: true, error: 'La membresía del club se encuentra suspendida.' };
    }
    console.error('Admin login failed', error instanceof Error ? error.message : 'unknown');
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function logoutAdmin() {
  await clearAdminSession();
}
