'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendAdminPushNotification } from '@/lib/push';

export interface ReleasedShift {
  id: string;
  courtId: string;
  courtName: string;
  dateStr: string;   // "YYYY-MM-DD"
  time: string;      // "HH:mm"
  endTime?: string;  // "HH:mm"
  releasedAt: string; // ISO date string
  reason?: string;
}

const SETTING_KEY = 'active_released_shifts';

/**
 * Publica un aviso de turno liberado para que aparezca en tiempo real en la PWA
 * y notifique a través de Web Push.
 */
export async function publishReleasedShift(shift: {
  courtId: string;
  courtName: string;
  dateStr: string;
  time: string;
  endTime?: string;
  reason?: string;
}) {
  try {
    const existing = await prisma.setting.findFirst({
      where: { key: SETTING_KEY },
    });

    let currentList: ReleasedShift[] = [];
    if (existing?.value) {
      try {
        currentList = JSON.parse(existing.value);
      } catch {}
    }

    const now = new Date();
    // Filtrar turnos pasados
    currentList = currentList.filter(s => {
      const shiftDate = new Date(`${s.dateStr}T${s.time}:00-03:00`);
      return shiftDate > now;
    });

    const newShift: ReleasedShift = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      courtId: shift.courtId,
      courtName: shift.courtName,
      dateStr: shift.dateStr,
      time: shift.time,
      endTime: shift.endTime,
      releasedAt: new Date().toISOString(),
      reason: shift.reason || 'Turno liberado',
    };

    // Evitar duplicados del mismo turno
    currentList = currentList.filter(s => !(s.courtId === shift.courtId && s.dateStr === shift.dateStr && s.time === shift.time));
    currentList.unshift(newShift);

    // Guardar máximo 10 avisos activos
    const toSave = currentList.slice(0, 10);

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(toSave) },
      });
    } else {
      await prisma.setting.create({
        data: {
          key: SETTING_KEY,
          value: JSON.stringify(toSave),
        },
      });
    }

    // Enviar push notification avisando a la comunidad
    const [y, m, d] = shift.dateStr.split('-');
    const formattedDate = `${d}/${m}`;
    await sendAdminPushNotification(
      '🎾 ¡Se liberó un turno!',
      `Cancha ${shift.courtName} disponible para el ${formattedDate} a las ${shift.time} hs. ¡Ingresá a la app y reservalo!`,
      `/?date=${shift.dateStr}&courtId=${shift.courtId}&slot=${shift.time}`
    ).catch(() => {});

    revalidatePath('/');
    revalidatePath('/reservas');

    return { success: true, shift: newShift };
  } catch (error) {
    console.error('Error publishing released shift:', error);
    return { success: false, error: 'Error al publicar aviso de turno liberado.' };
  }
}

/**
 * Obtiene los turnos liberados actualmente activos que todavía no han pasado.
 */
export async function getActiveReleasedShifts(): Promise<ReleasedShift[]> {
  try {
    const record = await prisma.setting.findFirst({
      where: { key: SETTING_KEY },
    });

    if (!record?.value) return [];

    const rawList: ReleasedShift[] = JSON.parse(record.value);
    const now = new Date();

    // Solo devolver turnos futuros
    return rawList.filter(s => {
      const shiftDate = new Date(`${s.dateStr}T${s.time}:00-03:00`);
      return shiftDate > now;
    });
  } catch (error) {
    return [];
  }
}

/**
 * Elimina un aviso de turno liberado (por ejemplo, cuando ya fue reservado).
 */
export async function removeReleasedShift(courtId: string, dateStr: string, time: string) {
  try {
    const record = await prisma.setting.findFirst({
      where: { key: SETTING_KEY },
    });

    if (!record?.value) return { success: true };

    const rawList: ReleasedShift[] = JSON.parse(record.value);
    const updated = rawList.filter(s => !(s.courtId === courtId && s.dateStr === dateStr && s.time === time));

    await prisma.setting.update({
      where: { id: record.id },
      data: { value: JSON.stringify(updated) },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
