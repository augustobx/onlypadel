import { prisma } from '@/lib/prisma';
import RankingsAdmin from './RankingsAdmin';

export default async function AdminRankingsPage() {
  const [categories, users, settings] = await Promise.all([
    prisma.rankingCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        entries: {
          include: { user: { select: { id: true, name: true, lastName: true, dni: true, phone: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: 'PLAYER', password: { not: null } },
      orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
      select: { id: true, name: true, lastName: true, dni: true, phone: true, category: true, isActive: true },
    }),
    prisma.systemSetting.findFirst({ where: { id: 1 }, select: { rankingsEnabled: true } }),
  ]);

  return (
    <RankingsAdmin
      initialCategories={categories.map((category) => ({
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
        entries: category.entries.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
        })),
      }))}
      users={users}
      rankingsEnabled={settings?.rankingsEnabled ?? true}
    />
  );
}
