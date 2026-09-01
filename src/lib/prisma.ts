import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';
import { hasTenantFeature, type FeatureKey } from '@/lib/features';

export { platformPrisma } from '@/lib/prisma-core';

const tenantModels = new Set([
  'User', 'Court', 'BusinessHour', 'Booking', 'FixedBooking', 'CourtBlock',
  'PushSubscription', 'Expense', 'Setting', 'Tournament', 'TournamentCategory',
  'TournamentTeam', 'TournamentGroup', 'TournamentGroupTeam', 'TournamentMatch',
  'RankingCategory', 'RankingEntry', 'PlayerCategoryLevel',
  'PlayerCategoryAssignment', 'SystemSetting',
]);

const modelFeatures: Record<string, FeatureKey> = {
  Court: 'reservations', BusinessHour: 'reservations', Booking: 'reservations',
  FixedBooking: 'reservations', CourtBlock: 'reservations',
  PushSubscription: 'push', Expense: 'expenses',
  Tournament: 'tournaments', TournamentCategory: 'tournaments', TournamentTeam: 'tournaments',
  TournamentGroup: 'tournaments', TournamentGroupTeam: 'tournaments', TournamentMatch: 'tournaments',
  RankingCategory: 'rankings', RankingEntry: 'rankings',
  PlayerCategoryLevel: 'player_categories', PlayerCategoryAssignment: 'player_categories',
};

const relationOwnership: Record<string, Record<string, string>> = {
  Booking: { courtId: 'court', userId: 'user', fixedBookingId: 'fixedBooking' },
  BusinessHour: { courtId: 'court' },
  FixedBooking: { courtId: 'court', userId: 'user' },
  CourtBlock: { courtId: 'court' },
  PushSubscription: { userId: 'user' },
  TournamentCategory: { tournamentId: 'tournament' },
  TournamentTeam: { categoryId: 'tournamentCategory', player1Id: 'user', player2Id: 'user' },
  TournamentGroup: { categoryId: 'tournamentCategory' },
  TournamentGroupTeam: { groupId: 'tournamentGroup', teamId: 'tournamentTeam' },
  TournamentMatch: {
    categoryId: 'tournamentCategory', groupId: 'tournamentGroup', nextMatchId: 'tournamentMatch',
    team1Id: 'tournamentTeam', team2Id: 'tournamentTeam', winnerId: 'tournamentTeam', courtId: 'court',
  },
  RankingEntry: { categoryId: 'rankingCategory', userId: 'user' },
  PlayerCategoryAssignment: { levelId: 'playerCategoryLevel', userId: 'user' },
};

const readOperations = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow',
  'findMany', 'count', 'aggregate', 'groupBy',
]);

const filteredWriteOperations = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

function withTenantWhere(where: unknown, tenantId: string) {
  return { AND: [where || {}, { tenantId }] };
}

function validateNestedWrites(value: unknown, tenantId: string, path = 'data') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNestedWrites(item, tenantId, `${path}[${index}]`));
    return;
  }

  const record = value as Record<string, unknown>;
  if ('tenantId' in record && record.tenantId !== tenantId) {
    throw new Error(`TENANT_OVERRIDE_REJECTED:${path}`);
  }

  for (const forbidden of ['connect', 'connectOrCreate', 'set', 'create', 'createMany', 'upsert', 'update', 'updateMany', 'delete', 'deleteMany']) {
    if (forbidden in record) throw new Error(`UNSAFE_NESTED_WRITE_REJECTED:${path}.${forbidden}`);
  }

  Object.entries(record).forEach(([key, nested]) => validateNestedWrites(nested, tenantId, `${path}.${key}`));
}

async function validateRelationOwnership(model: string, data: unknown, tenantId: string) {
  const relations = relationOwnership[model];
  if (!relations || !data) return;
  const rows = Array.isArray(data) ? data : [data];
  const client = platformPrisma as unknown as Record<string, { count(args: unknown): Promise<number> }>;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    for (const [field, targetModel] of Object.entries(relations)) {
      let id = record[field];
      if (id && typeof id === 'object' && 'set' in (id as Record<string, unknown>)) id = (id as Record<string, unknown>).set;
      if (id === undefined || id === null) continue;
      if (typeof id !== 'string') throw new Error(`INVALID_RELATION_ID:${model}.${field}`);
      const count = await client[targetModel].count({ where: { id, tenantId } });
      if (count !== 1) throw new Error(`CROSS_TENANT_RELATION_REJECTED:${model}.${field}`);
    }
  }
}

function tenantData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) return data.map((item) => tenantData(item, tenantId));
  validateNestedWrites(data, tenantId);
  return { ...(data as Record<string, unknown>), tenantId };
}

export const prisma = platformPrisma.$extends({
  name: 'onlypadel-tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !tenantModels.has(model)) {
          throw new Error(`PLATFORM_MODEL_REQUIRES_PLATFORM_CLIENT:${model || 'raw'}`);
        }

        const tenant = await resolveTenantContext();
        const feature = modelFeatures[model];
        const featureEnabled = !feature || await hasTenantFeature(feature);
        if (!featureEnabled && !readOperations.has(operation)) throw new Error(`FEATURE_DISABLED:${feature}`);
        const scopedTenantId = featureEnabled ? tenant.id : '__onlypadel_disabled_feature__';
        const mutableArgs = args as Record<string, unknown>;

        if (readOperations.has(operation)) {
          mutableArgs.where = withTenantWhere(mutableArgs.where, scopedTenantId);
        } else if (operation === 'create' || operation === 'createMany') {
          await validateRelationOwnership(model, mutableArgs.data, tenant.id);
          mutableArgs.data = tenantData(mutableArgs.data, tenant.id);
        } else if (filteredWriteOperations.has(operation)) {
          mutableArgs.where = withTenantWhere(mutableArgs.where, tenant.id);
          if ('data' in mutableArgs) {
            validateNestedWrites(mutableArgs.data, tenant.id);
            await validateRelationOwnership(model, mutableArgs.data, tenant.id);
          }
        } else if (operation === 'upsert') {
          mutableArgs.where = withTenantWhere(mutableArgs.where, tenant.id);
          await validateRelationOwnership(model, mutableArgs.create, tenant.id);
          await validateRelationOwnership(model, mutableArgs.update, tenant.id);
          mutableArgs.create = tenantData(mutableArgs.create, tenant.id);
          validateNestedWrites(mutableArgs.update, tenant.id);
        } else {
          throw new Error(`UNSUPPORTED_TENANT_OPERATION:${model}.${operation}`);
        }

        return query(args);
      },
    },
  },
});
