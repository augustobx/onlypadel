'use server';

import { prisma } from '@/lib/prisma';
import { tournamentSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';

export async function getTournaments() {
  try {
    await requireAdmin();
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { categories: true }
        }
      }
    });
    return { success: true, data: tournaments };
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return { success: false, error: 'Error al cargar torneos' };
  }
}

export async function getTournamentFull(id: string) {
  try {
    await requireAdmin();
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            teams: {
              include: { player1: true, player2: true }
            },
            matches: {
              include: { team1: true, team2: true, winner: true, group: true },
              orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }]
            },
            groups: {
              include: {
                teams: { include: { team: true }, orderBy: [{ points: 'desc' }, { matchesWon: 'desc' }, { setsWon: 'desc' }, { setsLost: 'asc' }, { gamesWon: 'desc' }, { gamesLost: 'asc' }] },
                matches: { include: { team1: true, team2: true } }
              }
            }
          }
        }
      }
    });
    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return { success: false, error: 'Error al cargar torneo' };
  }
}

export async function createTournament(data: unknown) {
  await requireAdmin();
  const result = tournamentSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error.flatten() };
  }

  const { name, startDate, endDate, entryFee, isPublished, requireDeposit, depositAmount, format, maxTeams } = result.data;

  try {
    const tournament = await prisma.tournament.create({
      data: {
        name,
        startDate,
        endDate,
        entryFee,
        status: 'DRAFT',
        isPublished,
        requireDeposit,
        depositAmount,
        format,
        maxTeams,
      }
    });

    revalidatePath('/admin/torneos');
    revalidatePath('/torneos');
    
    return { success: true, tournament };
  } catch (error) {
    console.error('Error creando torneo:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}

export async function updateTournament(id: string, data: unknown) {
  await requireAdmin();
  const result = tournamentSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error.flatten() };
  }

  const { name, startDate, endDate, entryFee, isPublished, requireDeposit, depositAmount, format, maxTeams } = result.data;

  try {
    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        name,
        startDate,
        endDate,
        entryFee,
        isPublished,
        requireDeposit,
        depositAmount,
        format,
        maxTeams,
      }
    });

    revalidatePath('/admin/torneos');
    revalidatePath(`/admin/torneos/${id}`);
    revalidatePath('/torneos');
    revalidatePath(`/torneos/${id}`);
    
    return { success: true, tournament };
  } catch (error) {
    console.error('Error actualizando torneo:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}

// Acción dedicada para cambiar el status (sin pasar por el schema completo)
const VALID_STATUSES = ['DRAFT', 'REGISTRATION', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

export async function updateTournamentStatus(id: string, status: string) {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status as ValidStatus)) {
    return { success: false, error: `Estado inválido: ${status}` };
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: { include: { teams: { include: { player1: true } }, matches: true } },
      },
    });
    if (!tournament) return { success: false, error: 'Torneo no encontrado' };
    const allowed: Record<ValidStatus, ValidStatus[]> = {
      DRAFT: ['REGISTRATION', 'REGISTRATION_CLOSED'],
      REGISTRATION: ['DRAFT', 'REGISTRATION_CLOSED', 'ONGOING'],
      REGISTRATION_CLOSED: ['REGISTRATION', 'ONGOING', 'DRAFT'],
      ONGOING: ['REGISTRATION_CLOSED', 'COMPLETED', 'REGISTRATION'],
      COMPLETED: ['ONGOING'],
    };
    if (status !== tournament.status && !allowed[tournament.status as ValidStatus]?.includes(status as ValidStatus)) {
      return { success: false, error: `No se puede pasar de ${tournament.status} a ${status}` };
    }
    if (status === 'ONGOING') {
      if (!tournament.categories.length) return { success: false, error: 'Creá al menos una categoría antes de iniciar' };
      const incompleteCategory = tournament.categories.find((category) =>
        category.teams.filter((team) => team.player1.phone !== 'DUMMY_PLAZA').length < 2
      );
      if (incompleteCategory) return { success: false, error: `La categoría ${incompleteCategory.name} necesita al menos dos parejas` };
    }
    if (status === 'COMPLETED') {
      const matches = tournament.categories.flatMap((category) => category.matches);
      if (!matches.length || matches.some((match) => match.status !== 'COMPLETED')) {
        return { success: false, error: 'No se puede finalizar mientras haya partidos pendientes' };
      }
    }
    await prisma.tournament.update({
      where: { id },
      data: { status: status as ValidStatus }
    });
    revalidatePath('/admin/torneos');
    revalidatePath(`/admin/torneos/${id}`);
    revalidatePath('/torneos');
    revalidatePath(`/torneos/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error actualizando estado:', error);
    return { success: false, error: 'Error al cambiar estado' };
  }
}

export async function deleteTournament(id: string) {
  try {
    await requireAdmin();
    // Eliminar en cascada: primero los datos hijos que no tienen onDelete: Cascade
    await prisma.$transaction(async (tx) => {
      const categories = await tx.tournamentCategory.findMany({ where: { tournamentId: id }, select: { id: true } });
      for (const category of categories) {
        await tx.tournamentMatch.deleteMany({ where: { categoryId: category.id } });
        await tx.tournamentGroupTeam.deleteMany({ where: { group: { categoryId: category.id } } });
        await tx.tournamentGroup.deleteMany({ where: { categoryId: category.id } });
        await tx.tournamentTeam.deleteMany({ where: { categoryId: category.id } });
      }
      await tx.tournamentCategory.deleteMany({ where: { tournamentId: id } });
      await tx.tournament.delete({ where: { id } });
    });
    
    revalidatePath('/admin/torneos');
    revalidatePath('/torneos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return { success: false, error: 'Error al eliminar torneo' };
  }
}
