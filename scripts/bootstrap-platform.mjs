import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const email = (process.env.ONLYPADEL_SUPERADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ONLYPADEL_SUPERADMIN_PASSWORD || '';
const name = (process.env.ONLYPADEL_SUPERADMIN_NAME || 'NanoLabs').trim();

if (!email || password.length < 12) {
  throw new Error('ONLYPADEL_SUPERADMIN_EMAIL and a password of at least 12 characters are required');
}

const connectionString = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });
const featureSets = {
  STARTER: ['reservations', 'users', 'whatsapp', 'push'],
  PRO: ['reservations', 'users', 'tournaments', 'rankings', 'player_categories', 'expenses', 'whatsapp', 'push', 'payments'],
  ENTERPRISE: ['reservations', 'users', 'tournaments', 'rankings', 'player_categories', 'expenses', 'whatsapp', 'push', 'payments'],
};

try {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.platformUser.upsert({
    where: { email },
    create: { email, name, passwordHash, role: 'SUPERADMIN', isActive: true },
    update: { name, passwordHash, role: 'SUPERADMIN', isActive: true },
  });

  for (const [code, features] of Object.entries(featureSets)) {
    const plan = await prisma.plan.upsert({
      where: { code },
      create: { code, name: code[0] + code.slice(1).toLowerCase(), price: code === 'STARTER' ? 0 : code === 'PRO' ? 60000 : 120000, isPublic: code !== 'ENTERPRISE' },
      update: { isActive: true },
    });
    for (const key of features) {
      await prisma.planFeature.upsert({
        where: { planId_key: { planId: plan.id, key } },
        create: { planId: plan.id, key, enabled: true },
        update: { enabled: true },
      });
    }
  }
} finally {
  await prisma.$disconnect();
}
