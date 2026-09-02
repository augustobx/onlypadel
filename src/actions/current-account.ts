'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { getUserSession } from '@/actions/user-auth';

export interface AccountMovement {
  id: string;
  createdAt: string; // ISO String
  type: 'CHARGE' | 'PAYMENT'; // CHARGE = Compra/Deuda generada (-), PAYMENT = Pago de deuda/Abono (+)
  amount: number;
  concept: string;
  method?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'SYSTEM';
  balanceAfter: number;
  notes?: string;
}

export interface UserAccountData {
  userId: string;
  userName: string;
  userPhone?: string;
  userDni?: string;
  balance: number; // Negativo = Debe dinero, Cero = Al día, Positivo = Saldo a favor
  movements: AccountMovement[];
}

/**
 * Verifica si el módulo de Cuentas Corrientes está habilitado en el club
 */
export async function isCurrentAccountEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.setting.findFirst({
      where: { key: 'current_account_enabled' }
    });
    // Por defecto habilitado si el club lo usa
    return setting ? setting.value === 'true' : true;
  } catch {
    return true;
  }
}

/**
 * Activa o desactiva el módulo desde la configuración
 */
export async function setCurrentAccountEnabled(enabled: boolean): Promise<{ success: boolean }> {
  try {
    await requireAdmin();
    const existing = await prisma.setting.findFirst({
      where: { key: 'current_account_enabled' }
    });

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: enabled ? 'true' : 'false' }
      });
    } else {
      await prisma.setting.create({
        data: {
          key: 'current_account_enabled',
          value: enabled ? 'true' : 'false'
        }
      });
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin/cantina');
    revalidatePath('/admin/cuentas-corrientes');
    return { success: true };
  } catch (err: any) {
    return { success: false };
  }
}

/**
 * Obtiene la cuenta corriente completa de un usuario
 */
export async function getUserCurrentAccount(userId: string): Promise<{ success: boolean; data?: UserAccountData; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, lastName: true, phone: true, dni: true }
    });

    if (!user) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const key = `current_account_${userId}`;
    const setting = await prisma.setting.findFirst({
      where: { key }
    });

    let balance = 0;
    let movements: AccountMovement[] = [];

    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        balance = Number(parsed.balance) || 0;
        movements = Array.isArray(parsed.movements) ? parsed.movements : [];
      } catch {}
    }

    const fullName = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Jugador';

    return {
      success: true,
      data: {
        userId: user.id,
        userName: fullName,
        userPhone: user.phone || undefined,
        userDni: user.dni || undefined,
        balance,
        movements: movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    };
  } catch (err: any) {
    return { success: false, error: 'Error al consultar cuenta corriente.' };
  }
}

/**
 * Agrega un movimiento a la cuenta corriente (Cargo o Pago)
 */
export async function addAccountMovement(params: {
  userId: string;
  type: 'CHARGE' | 'PAYMENT';
  amount: number;
  concept: string;
  method?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'SYSTEM';
  notes?: string;
}): Promise<{ success: boolean; data?: UserAccountData; error?: string }> {
  try {
    const userRes = await getUserCurrentAccount(params.userId);
    if (!userRes.success || !userRes.data) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const currentAccount = userRes.data;
    const cleanAmount = Math.abs(Number(params.amount));
    if (cleanAmount <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0.' };
    }

    // Si es CARGO (deuda generada), el saldo disminuye: balance - amount
    // Si es PAGO (abono de deuda), el saldo aumenta: balance + amount
    const newBalance = params.type === 'CHARGE'
      ? currentAccount.balance - cleanAmount
      : currentAccount.balance + cleanAmount;

    const movement: AccountMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      type: params.type,
      amount: cleanAmount,
      concept: params.concept.trim(),
      method: params.method || 'SYSTEM',
      balanceAfter: newBalance,
      notes: params.notes?.trim() || undefined,
    };

    const updatedMovements = [movement, ...currentAccount.movements];

    const key = `current_account_${params.userId}`;
    const payload = JSON.stringify({
      balance: newBalance,
      movements: updatedMovements
    });

    const existing = await prisma.setting.findFirst({
      where: { key }
    });

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: payload }
      });
    } else {
      await prisma.setting.create({
        data: { key, value: payload }
      });
    }

    // Actualizamos el índice global de cuentas con saldo
    await updateAccountIndex({
      userId: params.userId,
      userName: currentAccount.userName,
      userPhone: currentAccount.userPhone,
      userDni: currentAccount.userDni,
      balance: newBalance,
      lastUpdated: new Date().toISOString()
    });

    revalidatePath('/admin/cantina');
    revalidatePath('/admin/cuentas-corrientes');
    revalidatePath('/admin/caja');
    revalidatePath('/perfil');

    return {
      success: true,
      data: {
        ...currentAccount,
        balance: newBalance,
        movements: updatedMovements
      }
    };
  } catch (err: any) {
    console.error('Error adding account movement:', err);
    return { success: false, error: 'No se pudo registrar el movimiento.' };
  }
}

/**
 * Registra un cobro / pago de deuda a la cuenta corriente del socio
 */
export async function recordDebtPayment(params: {
  userId: string;
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const movementRes = await addAccountMovement({
      userId: params.userId,
      type: 'PAYMENT',
      amount: params.amount,
      concept: `Pago de deuda en cuenta corriente`,
      method: params.paymentMethod,
      notes: params.notes
    });

    if (!movementRes.success) {
      return { success: false, error: movementRes.error };
    }

    // Si pagó en efectivo o transferencia, lo registramos en la caja del día
    const dateStr = new Date().toISOString().split('T')[0];
    const key = `pos_sales_${dateStr}`;
    const existing = await prisma.setting.findFirst({ where: { key } });
    let currentSales: any[] = [];
    if (existing && existing.value) {
      try { currentSales = JSON.parse(existing.value); } catch {}
    }

    currentSales.unshift({
      id: `pago-cta-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dateStr,
      items: [{ productId: 'cta-corriente', name: `Cobro Cta. Cte. (${movementRes.data?.userName})`, price: params.amount, quantity: 1 }],
      totalAmount: params.amount,
      paymentMethod: params.paymentMethod,
      customerName: movementRes.data?.userName || 'Socio Club',
      notes: params.notes || 'Abono deuda cuenta corriente'
    });

    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(currentSales) } });
    } else {
      await prisma.setting.create({ data: { key, value: JSON.stringify(currentSales) } });
    }

    revalidatePath('/admin/caja');
    revalidatePath('/admin/cuentas-corrientes');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Error al registrar el cobro.' };
  }
}

/**
 * Auxiliar para mantener el índice de socios con cuenta corriente
 */
async function updateAccountIndex(entry: {
  userId: string;
  userName: string;
  userPhone?: string;
  userDni?: string;
  balance: number;
  lastUpdated: string;
}) {
  try {
    const key = 'current_accounts_index';
    const existing = await prisma.setting.findFirst({ where: { key } });
    let index: Record<string, any> = {};

    if (existing && existing.value) {
      try { index = JSON.parse(existing.value); } catch {}
    }

    index[entry.userId] = entry;

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(index) }
      });
    } else {
      await prisma.setting.create({
        data: { key, value: JSON.stringify(index) }
      });
    }
  } catch (e) {
    console.error('Error updating account index:', e);
  }
}

/**
 * Obtiene el listado de todas las cuentas corrientes para el panel admin
 */
export async function getAllAccountsSummary(): Promise<{
  success: boolean;
  data: {
    userId: string;
    userName: string;
    userPhone?: string;
    userDni?: string;
    balance: number;
    lastUpdated: string;
  }[];
  totalDebt: number;
}> {
  try {
    await requireAdmin();
    const key = 'current_accounts_index';
    const setting = await prisma.setting.findFirst({ where: { key } });

    if (!setting || !setting.value) {
      return { success: true, data: [], totalDebt: 0 };
    }

    const index = JSON.parse(setting.value) as Record<string, any>;
    const list = Object.values(index).map((item: any) => ({
      userId: item.userId,
      userName: item.userName,
      userPhone: item.userPhone,
      userDni: item.userDni,
      balance: Number(item.balance) || 0,
      lastUpdated: item.lastUpdated || new Date().toISOString()
    }));

    // Ordenar: primero los que más deben (saldo más negativo)
    list.sort((a, b) => a.balance - b.balance);

    // Sumar solo saldos negativos (deuda de socios con el club)
    const totalDebt = list
      .filter(a => a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return { success: true, data: list, totalDebt };
  } catch (err: any) {
    return { success: false, data: [], totalDebt: 0 };
  }
}

/**
 * Busca usuarios registrados para el buscador de caja/cantina
 * devolviendo además su saldo actual de cuenta corriente
 */
export async function searchUsersForPos(query: string): Promise<{
  success: boolean;
  data: {
    id: string;
    name: string;
    phone?: string | null;
    dni?: string | null;
    balance: number;
  }[];
}> {
  try {
    await requireAdmin();
    const q = query.trim();
    if (!q) return { success: true, data: [] };

    const users = await prisma.user.findMany({
      where: {
        role: 'PLAYER',
        OR: [
          { name: { contains: q } },
          { lastName: { contains: q } },
          { phone: { contains: q } },
          { dni: { contains: q } },
          { email: { contains: q } },
        ]
      },
      take: 8,
      select: {
        id: true,
        name: true,
        lastName: true,
        phone: true,
        dni: true
      }
    });

    // Consultamos el saldo de cada usuario en paralelo
    const results = await Promise.all(
      users.map(async u => {
        const key = `current_account_${u.id}`;
        const setting = await prisma.setting.findFirst({ where: { key } });
        let balance = 0;
        if (setting && setting.value) {
          try {
            const parsed = JSON.parse(setting.value);
            balance = Number(parsed.balance) || 0;
          } catch {}
        }
        const fullName = `${u.name || ''} ${u.lastName || ''}`.trim() || 'Jugador';
        return {
          id: u.id,
          name: fullName,
          phone: u.phone,
          dni: u.dni,
          balance
        };
      })
    );

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, data: [] };
  }
}

/**
 * Obtiene la cuenta corriente del usuario actualmente logueado en la PWA
 */
export async function getMyCurrentAccount(): Promise<{
  success: boolean;
  enabled: boolean;
  data?: UserAccountData;
  error?: string;
}> {
  try {
    const enabled = await isCurrentAccountEnabled();
    if (!enabled) {
      return { success: true, enabled: false };
    }

    const session = await getUserSession();
    if (!session || !session.id) {
      return { success: false, enabled, error: 'No autenticado.' };
    }

    const res = await getUserCurrentAccount(session.id);
    return {
      success: res.success,
      enabled: true,
      data: res.data,
      error: res.error
    };
  } catch (err: any) {
    return { success: false, enabled: false, error: 'Error al obtener cuenta.' };
  }
}
