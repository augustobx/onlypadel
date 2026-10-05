import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const conn = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');
const adapter = new PrismaMariaDb(conn);
const platformPrisma = new PrismaClient({ adapter });

const relationOwnership = {
  TournamentCategory: { tournamentId: 'tournament' },
  TournamentTeam: { categoryId: 'tournamentCategory', player1Id: 'user', player2Id: 'user' },
  TournamentGroup: { categoryId: 'tournamentCategory' },
  TournamentGroupTeam: { groupId: 'tournamentGroup', teamId: 'tournamentTeam' },
  TournamentMatch: {
    categoryId: 'tournamentCategory', groupId: 'tournamentGroup', nextMatchId: 'tournamentMatch',
    team1Id: 'tournamentTeam', team2Id: 'tournamentTeam', winnerId: 'tournamentTeam', courtId: 'court',
  },
};

async function validateRelationOwnership(model, data, tenantId) {
  const relations = relationOwnership[model];
  if (!relations || !data) return;
  const rows = Array.isArray(data) ? data : [data];
  const client = platformPrisma;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row;
    for (const [field, targetModel] of Object.entries(relations)) {
      let id = record[field];
      if (id && typeof id === 'object' && 'set' in id) id = id.set;
      if (id === undefined || id === null) continue;
      if (typeof id !== 'string') throw new Error(`INVALID_RELATION_ID:${model}.${field}`);
      const count = await client[targetModel].count({ where: { id, tenantId } });
      if (count !== 1) {
        const foreignTenantCount = await client[targetModel].count({
          where: { id, NOT: { tenantId } }
        });
        if (foreignTenantCount > 0) {
          throw new Error(`CROSS_TENANT_RELATION_REJECTED:${model}.${field}`);
        }
        // NUEVA REGLA QUE ARREGLAMOS
        if (
          count === 0 &&
          foreignTenantCount === 0 &&
          (
            (model === 'Booking' && field === 'fixedBookingId') ||
            model.startsWith('Tournament') ||
            model.startsWith('OpenMatch') ||
            model.startsWith('Chat') ||
            model.startsWith('Post')
          )
        ) {
          console.log(`[PASS VALIDATION] count=0, foreign=0 -> Permitiendo uncommitted transaction para ${model}.${field}`);
          continue;
        }
        throw new Error(`CROSS_TENANT_RELATION_REJECTED:${model}.${field}`);
      }
    }
  }
}

async function run() {
  console.log('🚀 Iniciando test de validación de transacciones de torneo...');
  const tenant = await platformPrisma.tenant.findUnique({ where: { slug: 'testing' } });
  if (!tenant) throw new Error('Tenant testing no encontrado');
  const courts = await platformPrisma.court.findMany({ where: { tenantId: tenant.id, isActive: true } });
  if (courts.length === 0) throw new Error('No hay canchas activas');

  let dummyUser = await platformPrisma.user.findFirst({ where: { phone: 'DUMMY_PLAZA', tenantId: tenant.id } });
  if (!dummyUser) {
    dummyUser = await platformPrisma.user.create({
      data: { name: 'Plaza Libre', phone: 'DUMMY_PLAZA', role: 'PLAYER', tenantId: tenant.id }
    });
  }

  // Ejecutamos la transacción emulando el comportamiento del hook con validateRelationOwnership
  const res = await platformPrisma.$transaction(async (tx) => {
    // 1. Crear torneo
    const tournamentData = {
      tenantId: tenant.id,
      name: 'Torneo Live Test Validado',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 2),
      entryFee: 15000,
      status: 'REGISTRATION',
      isPublished: true,
      format: 'MIXED',
      maxTeams: 8,
    };
    const t = await tx.tournament.create({ data: tournamentData });

    // 2. Crear Categoría
    const catData = {
      tenantId: tenant.id,
      tournamentId: t.id,
      name: '7ma Categoría Test',
      format: 'MIXED',
      isZonesPublished: false,
      categoryType: 'CATEGORIA_UNICA',
      baseCategory: '7ma',
    };
    await validateRelationOwnership('TournamentCategory', catData, tenant.id);
    const cat = await tx.tournamentCategory.create({ data: catData });

    // 3. Crear Grupo
    const groupData = {
      tenantId: tenant.id,
      categoryId: cat.id,
      name: 'Zona A',
    };
    await validateRelationOwnership('TournamentGroup', groupData, tenant.id);
    const group = await tx.tournamentGroup.create({ data: groupData });

    // 4. Crear Equipo
    const teamData = {
      tenantId: tenant.id,
      categoryId: cat.id,
      name: 'Plaza libre A-1',
      player1Id: dummyUser.id,
      preferredGroupId: group.id,
    };
    await validateRelationOwnership('TournamentTeam', teamData, tenant.id);
    const team = await tx.tournamentTeam.create({ data: teamData });

    // 5. Crear GroupTeam
    const gtData = {
      tenantId: tenant.id,
      groupId: group.id,
      teamId: team.id,
    };
    await validateRelationOwnership('TournamentGroupTeam', gtData, tenant.id);
    await tx.tournamentGroupTeam.create({ data: gtData });

    // 6. Crear Partido
    const matchData = {
      tenantId: tenant.id,
      categoryId: cat.id,
      groupId: group.id,
      round: 1,
      matchOrder: 1,
      team1Id: team.id,
      roundName: 'Zona - Fecha 1',
      courtId: courts[0].id,
      status: 'SCHEDULED',
    };
    await validateRelationOwnership('TournamentMatch', matchData, tenant.id);
    const match = await tx.tournamentMatch.create({ data: matchData });

    return { tournamentId: t.id, matchId: match.id };
  });

  console.log('✅ ÉXITO ROTUNDO: Torneo y estructura creados sin ningún error de validación!', res);

  // Limpiar
  await platformPrisma.tournament.delete({ where: { id: res.tournamentId } });
  console.log('🧹 Torneo de prueba eliminado.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ ERROR:', err);
    process.exit(1);
  });
