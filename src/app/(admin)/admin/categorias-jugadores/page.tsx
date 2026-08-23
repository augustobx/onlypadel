import { prisma } from '@/lib/prisma';
import PlayerCategoriesAdmin from './PlayerCategoriesAdmin';

export default async function PlayerCategoriesAdminPage() {
  const [levels, users] = await Promise.all([
    prisma.playerCategoryLevel.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { assignments: { orderBy: { externalName: 'asc' }, include: { user: { select: { id: true, name: true, lastName: true, dni: true, phone: true } } } } },
    }),
    prisma.user.findMany({ where: { role: 'PLAYER', isActive: true }, orderBy: [{ name: 'asc' }, { lastName: 'asc' }], select: { id: true, name: true, lastName: true, dni: true, phone: true, category: true } }),
  ]);
  return <PlayerCategoriesAdmin initialLevels={levels} users={users} />;
}
