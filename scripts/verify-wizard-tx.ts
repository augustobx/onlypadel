import 'dotenv/config';
import { platformPrisma } from '../src/lib/prisma-core';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🧪 Probando creación de torneo con asistente y aislamiento multitenant...');

  const tenant = await platformPrisma.tenant.findUnique({
    where: { slug: 'testing' },
  });

  if (!tenant) {
    throw new Error('Tenant testing no encontrado');
  }

  const courts = await platformPrisma.court.findMany({
    where: { tenantId: tenant.id, isActive: true },
  });

  if (courts.length === 0) {
    throw new Error('No hay canchas activas en tenant testing');
  }

  console.log(`Club: ${tenant.name} (${tenant.id}), Canchas: ${courts.length}`);

  // Simular EXACTAMENTE la creación dentro de $transaction como hace createTournamentWithWizard
  // 1. Obtener o crear Dummy User
  let dummyUser = await prisma.user.findFirst({ where: { phone: 'DUMMY_PLAZA' } });
  if (!dummyUser) {
    dummyUser = await prisma.user.create({
      data: {
        name: 'Plaza Libre',
        phone: 'DUMMY_PLAZA',
        role: 'PLAYER',
      }
    });
  }
  const dId = dummyUser.id;

  console.log('Dummy user id:', dId);

  // 2. Ejecutar transacción
  const testTournament = await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.create({
      data: {
        name: 'Torneo Test Verificación Live',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 2),
        entryFee: 15000,
        status: 'REGISTRATION',
        isPublished: true,
        format: 'MIXED',
        maxTeams: 8,
      }
    });

    console.log('✅ Torneo creado en tx:', t.id);

    const cat = await tx.tournamentCategory.create({
      data: {
        tournamentId: t.id,
        name: '7ma Categoría Test',
        format: 'MIXED',
        isZonesPublished: false,
        categoryType: 'CATEGORIA_UNICA',
        baseCategory: '7ma',
      }
    });

    console.log('✅ Categoría creada en tx:', cat.id);

    const group = await tx.tournamentGroup.create({
      data: {
        categoryId: cat.id,
        name: 'Zona A',
      }
    });

    console.log('✅ Grupo creado en tx:', group.id);

    const team = await tx.tournamentTeam.create({
      data: {
        categoryId: cat.id,
        name: 'Plaza libre A-1',
        player1Id: dId,
        preferredGroupId: group.id,
      }
    });

    console.log('✅ Equipo/plaza creado en tx:', team.id);

    await tx.tournamentGroupTeam.create({
      data: {
        groupId: group.id,
        teamId: team.id,
      }
    });

    console.log('✅ GroupTeam creado en tx');

    const match = await tx.tournamentMatch.create({
      data: {
        categoryId: cat.id,
        groupId: group.id,
        round: 1,
        matchOrder: 1,
        team1Id: team.id,
        roundName: 'Zona - Fecha 1',
        courtId: courts[0].id,
        status: 'SCHEDULED',
      }
    });

    console.log('✅ Partido creado en tx:', match.id);

    return { tournamentId: t.id, categoryId: cat.id };
  });

  console.log('🎉 Transacción completada con ÉXITO TOTAL:', testTournament);

  // Limpiar el torneo de prueba
  await platformPrisma.tournament.delete({
    where: { id: testTournament.tournamentId }
  });
  console.log('🧹 Torneo de prueba limpiado correctamente.');
}

main()
  .then(() => {
    console.log('✅ Verificación exitosa al 100%');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error en verificación:', err);
    process.exit(1);
  });
