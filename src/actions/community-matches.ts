'use server';

import { prisma } from '@/lib/prisma';
import { readUserSessionId } from '@/lib/user-session';
import { revalidatePath } from 'next/cache';
import { requireTenantFeature } from '@/lib/features';
import type { PreferredPosition, OpenMatchStatus } from '@prisma/client';

export interface OpenMatchCardData {
  id: string;
  bookingId: string | null;
  courtName: string;
  date: Date;
  startTime: string;
  endTime: string;
  level: string | null;
  slotsNeeded: number;
  positionNeeded: PreferredPosition | null;
  description: string | null;
  status: OpenMatchStatus;
  createdAt: Date;
  creator: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    category: string | null;
    phone: string | null;
  };
  players: {
    id: string;
    user: {
      id: string;
      name: string | null;
      lastName: string | null;
      avatarUrl: string | null;
      category: string | null;
    };
    joinedAt: Date;
  }[];
  isCreator: boolean;
  hasJoined: boolean;
}

export async function getOpenMatches(filters?: {
  date?: string;
  level?: string;
  status?: OpenMatchStatus;
}) {
  try {
    await requireTenantFeature('community');
    const currentUserId = await readUserSessionId();

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = 'OPEN';
    }

    if (filters?.date) {
      const startOfDay = new Date(`${filters.date}T00:00:00-03:00`);
      const endOfDay = new Date(`${filters.date}T23:59:59.999-03:00`);
      where.date = { gte: startOfDay, lte: endOfDay };
    } else {
      // Por defecto no mostrar turnos del pasado
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      where.date = { gte: startOfToday };
    }

    if (filters?.level && filters.level !== 'ALL') {
      where.level = { contains: filters.level };
    }

    const matches = await prisma.openMatch.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarUrl: true,
            category: true,
            phone: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                avatarUrl: true,
                category: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
      take: 50,
    });

    const data: OpenMatchCardData[] = matches.map((m) => ({
      id: m.id,
      bookingId: m.bookingId,
      courtName: m.courtName,
      date: m.date,
      startTime: m.startTime,
      endTime: m.endTime,
      level: m.level,
      slotsNeeded: m.slotsNeeded,
      positionNeeded: m.positionNeeded,
      description: m.description,
      status: m.status,
      createdAt: m.createdAt,
      creator: m.creator,
      players: m.players,
      isCreator: currentUserId ? m.creatorId === currentUserId : false,
      hasJoined: currentUserId
        ? m.players.some((p) => p.userId === currentUserId)
        : false,
    }));

    return { success: true, matches: data };
  } catch (error) {
    console.error('Error fetching open matches:', error);
    return { success: false, error: 'Error al cargar las convocatorias de juego.', matches: [] };
  }
}

export interface UserUpcomingBookingOption {
  id: string;
  courtName: string;
  date: Date;
  dateFormatted: string;
  timeFormatted: string;
  startTime: string;
  endTime: string;
  alreadyPublished: boolean;
  publishedMatchId?: string;
  publishedSlotsNeeded?: number;
}

export async function getUserUpcomingBookings(): Promise<{
  success: boolean;
  notLoggedIn: boolean;
  bookings: UserUpcomingBookingOption[];
}> {
  try {
    const userId = await readUserSessionId();
    if (!userId) {
      return { success: false, notLoggedIn: true, bookings: [] };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, dni: true, phone: true },
    });

    const now = new Date();
    const orConditions: any[] = [{ userId }];
    if (user?.dni) orConditions.push({ user: { dni: user.dni } });
    if (user?.phone) {
      orConditions.push({ user: { phone: user.phone } });
      const digits = user.phone.replace(/\D/g, '');
      if (digits.length >= 8) {
        orConditions.push({ user: { phone: { contains: digits.slice(-8) } } });
      }
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: orConditions,
        startTime: { gte: now },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        court: true,
        openMatches: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const data: UserUpcomingBookingOption[] = bookings.map((b) => {
      const startTimeStr = new Date(b.startTime).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      const endTimeStr = new Date(b.endTime).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });

      const publishedMatch = b.openMatches[0];

      return {
        id: b.id,
        courtName: b.court.name,
        date: b.startTime,
        dateFormatted: new Date(b.startTime).toLocaleDateString('es-AR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'America/Argentina/Buenos_Aires',
        }),
        timeFormatted: `${startTimeStr} - ${endTimeStr} hs`,
        startTime: startTimeStr,
        endTime: endTimeStr,
        alreadyPublished: b.openMatches.length > 0,
        publishedMatchId: publishedMatch?.id,
        publishedSlotsNeeded: publishedMatch?.slotsNeeded,
      };
    });

    return { success: true, notLoggedIn: false, bookings: data };
  } catch (error) {
    console.error('Error fetching user upcoming bookings:', error);
    return { success: false, notLoggedIn: false, bookings: [] };
  }
}

export async function createOpenMatchFromBooking(data: {
  bookingId: string;
  slotsNeeded: number;
  level?: string;
  positionNeeded?: PreferredPosition;
  description?: string;
}) {
  try {
    await requireTenantFeature('community');
    let userId = await readUserSessionId();

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        court: true,
        user: true,
        openMatches: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });

    if (!booking) {
      return { success: false, error: 'No se encontró la reserva vinculada.' };
    }

    if (!userId) {
      if (booking.userId) {
        userId = booking.userId;
      } else {
        return { success: false, error: 'Inicia sesión para convocar jugadores.' };
      }
    } else if (booking.userId && booking.userId !== userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { dni: true, phone: true },
      });
      const isSamePerson =
        (currentUser?.dni && booking.user?.dni && currentUser.dni === booking.user.dni) ||
        (currentUser?.phone && booking.user?.phone && currentUser.phone === booking.user.phone);
      if (!isSamePerson) {
        return { success: false, error: 'Solo el titular de la reserva puede publicar este turno.' };
      }
    }

    // Si ya existe una convocatoria abierta para esta misma reserva, actualizarla o avisar
    if (booking.openMatches.length > 0) {
      const existing = booking.openMatches[0];
      await prisma.openMatch.update({
        where: { id: existing.id },
        data: {
          slotsNeeded: Math.max(1, Math.min(3, data.slotsNeeded)),
          level: data.level || existing.level,
          positionNeeded: data.positionNeeded || null,
          description: data.description || existing.description,
          status: 'OPEN',
        },
      });

      revalidatePath('/comunidad');
      revalidatePath('/comunidad/turnos');
      revalidatePath('/perfil');

      return { success: true, matchId: existing.id, updated: true };
    }

    // Formatear horas en formato estricto 24hs "HH:mm"
    const formatHHmm = (dateInput: Date | string) => {
      try {
        const d = new Date(dateInput);
        const parts = new Intl.DateTimeFormat('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        }).formatToParts(d);
        const hour = parts.find((p) => p.type === 'hour')?.value || '00';
        const minute = parts.find((p) => p.type === 'minute')?.value || '00';
        return `${hour}:${minute}`;
      } catch {
        return '00:00';
      }
    };

    const startTimeStr = formatHHmm(booking.startTime);
    const endTimeStr = formatHHmm(booking.endTime);

    const openMatch = await prisma.openMatch.create({
      data: {
        bookingId: booking.id,
        creatorId: userId,
        courtId: booking.courtId,
        courtName: booking.court.name,
        date: booking.startTime,
        startTime: startTimeStr,
        endTime: endTimeStr,
        slotsNeeded: Math.max(1, Math.min(3, data.slotsNeeded)),
        level: data.level || (booking.user?.category ? `Categoría ${booking.user.category}` : null),
        positionNeeded: data.positionNeeded || null,
        description: data.description || null,
        status: 'OPEN',
      },
    });

    // Crear automáticamente un post en el muro para darle difusión instantánea
    try {
      const positionText = data.positionNeeded ? ` (Posición: ${data.positionNeeded})` : '';
      const levelText = data.level ? ` | Nivel: ${data.level}` : '';
      const dateFormatted = new Date(booking.startTime).toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      await prisma.post.create({
        data: {
          authorId: userId,
          type: 'PLAYER',
          content: `🎾 ¡Faltan ${openMatch.slotsNeeded} jugador${openMatch.slotsNeeded > 1 ? 'es' : ''} para completar turno!\n📅 ${dateFormatted} a las ${startTimeStr} hs en ${booking.court.name}${levelText}${positionText}.\n${data.description ? `"${data.description}"` : '¡Comunicate o sumate desde la sección Turnos Armados!'}`,
        },
      });
    } catch (e) {
      console.error('Error auto-creating post for open match:', e);
    }

    revalidatePath('/comunidad');
    revalidatePath('/comunidad/turnos');
    revalidatePath('/perfil');

    return { success: true, matchId: openMatch.id };
  } catch (error: any) {
    console.error('Error creating open match from booking:', error);
    return { success: false, error: error?.message || 'No se pudo crear la convocatoria.' };
  }
}

export async function createManualOpenMatch(data: {
  courtName: string;
  dateStr: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotsNeeded: number;
  level?: string;
  positionNeeded?: PreferredPosition;
  description?: string;
}) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'Inicia sesión para convocar jugadores.' };

    const matchDate = new Date(`${data.dateStr}T${data.startTime}:00-03:00`);

    const openMatch = await prisma.openMatch.create({
      data: {
        creatorId: userId,
        courtName: data.courtName || 'Cancha del Club',
        date: matchDate,
        startTime: (data.startTime || '00:00').trim().slice(0, 30),
        endTime: (data.endTime || '00:00').trim().slice(0, 30),
        slotsNeeded: Math.max(1, Math.min(3, data.slotsNeeded)),
        level: data.level || null,
        positionNeeded: data.positionNeeded || null,
        description: data.description || null,
        status: 'OPEN',
      },
    });

    revalidatePath('/comunidad');
    revalidatePath('/comunidad/turnos');

    return { success: true, matchId: openMatch.id };
  } catch (error) {
    console.error('Error creating manual open match:', error);
    return { success: false, error: 'No se pudo crear el turno abierto.' };
  }
}

export async function joinOpenMatch(matchId: string) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'Inicia sesión para anotarte.' };

    const match = await prisma.openMatch.findUnique({
      where: { id: matchId },
      include: { players: true, creator: true },
    });

    if (!match) return { success: false, error: 'El turno no existe o fue eliminado.' };
    if (match.status !== 'OPEN') return { success: false, error: 'Este turno ya se encuentra completo o cancelado.' };
    if (match.creatorId === userId) return { success: false, error: 'Ya eres el creador de este turno.' };

    const alreadyJoined = match.players.some((p) => p.userId === userId);
    if (alreadyJoined) return { success: false, error: 'Ya estás anotado en este turno.' };

    // Agregar jugador
    await prisma.openMatchPlayer.create({
      data: {
        matchId,
        userId,
      },
    });

    // Comprobar si se completaron los lugares
    const newPlayerCount = match.players.length + 1;
    if (newPlayerCount >= match.slotsNeeded) {
      await prisma.openMatch.update({
        where: { id: matchId },
        data: { status: 'FULL' },
      });
    }

    // Notificar al organizador
    try {
      const joiningUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, lastName: true },
      });
      const name = joiningUser ? `${joiningUser.name} ${joiningUser.lastName || ''}`.trim() : 'Un jugador';
      const dateFormatted = new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(new Date(match.date));

      await prisma.communityNotification.create({
        data: {
          userId: match.creatorId,
          type: 'MATCH_JOIN',
          title: '¡Alguien se sumó a tu turno! 🎾',
          body: `${name} se sumó a tu convocatoria para el ${dateFormatted} a las ${match.startTime} hs en ${match.courtName}.`,
          linkUrl: `/comunidad/turnos`,
        },
      });
    } catch (e) {
      console.error('Error creating join notification:', e);
    }

    revalidatePath('/comunidad/turnos');
    revalidatePath('/comunidad/notificaciones');
    revalidatePath('/comunidad');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error joining open match:', error);
    return { success: false, error: 'No se pudo unir al turno.' };
  }
}

export async function leaveOpenMatch(matchId: string) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'Inicia sesión.' };

    const match = await prisma.openMatch.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!match) return { success: false, error: 'Turno no encontrado.' };

    await prisma.openMatchPlayer.deleteMany({
      where: { matchId, userId },
    });

    // Si estaba FULL, volver a abrirlo
    if (match.status === 'FULL') {
      await prisma.openMatch.update({
        where: { id: matchId },
        data: { status: 'OPEN' },
      });
    }

    // Notificar al organizador que el jugador liberó el cupo
    try {
      const leavingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, lastName: true },
      });
      const name = leavingUser ? `${leavingUser.name} ${leavingUser.lastName || ''}`.trim() : 'Un jugador';
      const dateFormatted = new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(new Date(match.date));

      await prisma.communityNotification.create({
        data: {
          userId: match.creatorId,
          type: 'MATCH_LEAVE',
          title: 'Cupo liberado en tu turno 🎾',
          body: `${name} se dio de baja de tu convocatoria para el ${dateFormatted} a las ${match.startTime} hs.`,
          linkUrl: '/comunidad/turnos',
        },
      });
    } catch (e) {
      console.error('Error creating leave notification:', e);
    }

    revalidatePath('/comunidad/turnos');
    revalidatePath('/comunidad/notificaciones');
    revalidatePath('/comunidad');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error leaving open match:', error);
    return { success: false, error: 'No se pudo cancelar tu participación.' };
  }
}

// ─── Remover jugador anotado (solo para el creador del turno o admin) ───────
export async function removePlayerFromOpenMatch(matchId: string, targetUserId: string) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'Inicia sesión.' };

    const match = await prisma.openMatch.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: {
            user: { select: { id: true, name: true, lastName: true } },
          },
        },
      },
    });

    if (!match) return { success: false, error: 'Turno no encontrado.' };

    // Solo el creador o un admin puede remover a un jugador
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (match.creatorId !== userId && currentUser?.role !== 'ADMIN') {
      return { success: false, error: 'Solo el creador del turno puede remover jugadores.' };
    }

    const playerToRemove = match.players.find((p) => p.userId === targetUserId);
    if (!playerToRemove) {
      return { success: false, error: 'El jugador no se encuentra anotado en este turno.' };
    }

    // Eliminar jugador de la convocatoria
    await prisma.openMatchPlayer.deleteMany({
      where: { matchId, userId: targetUserId },
    });

    // Si estaba FULL, volver a abrirlo
    if (match.status === 'FULL') {
      await prisma.openMatch.update({
        where: { id: matchId },
        data: { status: 'OPEN' },
      });
    }

    // Notificar al jugador removido
    try {
      const dateFormatted = new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(new Date(match.date));

      await prisma.communityNotification.create({
        data: {
          userId: targetUserId,
          type: 'MATCH_LEAVE',
          title: 'Aviso de convocatoria 🎾',
          body: `El organizador ha liberado tu cupo para el partido del ${dateFormatted} a las ${match.startTime} hs en ${match.courtName}.`,
          linkUrl: '/comunidad/turnos',
        },
      });
    } catch (notifErr) {
      console.warn('Error creating removal notification:', notifErr);
    }

    revalidatePath('/comunidad/turnos');
    revalidatePath('/comunidad/notificaciones');
    revalidatePath('/comunidad');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Error removing player from open match:', error);
    return { success: false, error: error?.message || 'No se pudo remover al jugador.' };
  }
}

export async function cancelOpenMatch(matchId: string) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'Inicia sesión.' };

    const match = await prisma.openMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) return { success: false, error: 'Turno no encontrado.' };
    if (match.creatorId !== userId) {
      return { success: false, error: 'Solo el creador puede cancelar esta convocatoria.' };
    }

    await prisma.openMatch.update({
      where: { id: matchId },
      data: { status: 'CANCELLED' },
    });

    revalidatePath('/comunidad/turnos');
    return { success: true };
  } catch (error) {
    console.error('Error canceling open match:', error);
    return { success: false, error: 'No se pudo cancelar la convocatoria.' };
  }
}
