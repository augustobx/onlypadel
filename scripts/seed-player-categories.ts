import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');
if (!connectionString) throw new Error('DATABASE_URL no está configurada.');
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });

const defaults = [
  { name: '7ma', order: 10, color: '#0ea5e9', description: 'Categoría inicial y recreativa.' },
  { name: '6ta', order: 20, color: '#10b981', description: 'Nivel intermedio inicial.' },
  { name: '5ta', order: 30, color: '#f59e0b', description: 'Nivel intermedio competitivo.' },
  { name: '4ta', order: 40, color: '#ef4444', description: 'Nivel avanzado competitivo.' },
];

async function main() {
  const levelByName = new Map<string, string>();
  for (const item of defaults) {
    const level = await prisma.playerCategoryLevel.upsert({
      where: { name: item.name },
      create: { name: item.name, displayOrder: item.order, color: item.color, description: item.description },
      update: {},
    });
    levelByName.set(item.name, level.id);
  }
  const users = await prisma.user.findMany({ where: { category: { not: null }, role: 'PLAYER' }, select: { id: true, category: true } });
  for (const user of users) {
    const levelId = levelByName.get(user.category?.trim() || '');
    if (!levelId) continue;
    await prisma.playerCategoryAssignment.upsert({
      where: { userId: user.id },
      create: { userId: user.id, levelId, isPublished: true },
      update: { levelId },
    });
  }
  const samples = [
    { id: 'seed-category-external-1', name: 'Martín Acosta', phone: '1155553101', category: '7ma' },
    { id: 'seed-category-external-2', name: 'Paula Méndez', phone: '1155553102', category: '6ta' },
    { id: 'seed-category-external-3', name: 'Ramiro Sosa', phone: '1155553103', category: '5ta' },
    { id: 'seed-category-external-4', name: 'Camila Ferreyra', phone: '1155553104', category: '4ta' },
  ];
  for (const sample of samples) {
    await prisma.playerCategoryAssignment.upsert({
      where: { id: sample.id },
      create: { id: sample.id, externalName: sample.name, externalPhone: sample.phone, levelId: levelByName.get(sample.category)!, publicNote: 'Jugador evaluado por el club.' },
      update: { externalName: sample.name, externalPhone: sample.phone, levelId: levelByName.get(sample.category)! },
    });
  }
  console.log(`Padrón listo: ${defaults.length} categorías, ${users.length + samples.length} jugadores.`);
}

main().finally(() => prisma.$disconnect());
