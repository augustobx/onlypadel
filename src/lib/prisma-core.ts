import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as {
  onlyPadelPlatformPrisma: PrismaClient | undefined;
};

const connectionString = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');

function getConnectionStringWithPoolOpts() {
  try {
    const url = new URL(connectionString);
    const isBuildPhase = process.env.npm_lifecycle_event === 'build';
    if (!url.searchParams.has('connectionLimit')) url.searchParams.set('connectionLimit', isBuildPhase ? '1' : '6');
    if (!url.searchParams.has('acquireTimeout')) url.searchParams.set('acquireTimeout', '30000');
    if (!url.searchParams.has('idleTimeout')) url.searchParams.set('idleTimeout', '30');
    if (!url.searchParams.has('minDelayValidation')) url.searchParams.set('minDelayValidation', '500');
    if (!url.searchParams.has('resetAfterUse')) url.searchParams.set('resetAfterUse', 'true');
    return url.toString();
  } catch {
    return connectionString;
  }
}

const adapter = new PrismaMariaDb(getConnectionStringWithPoolOpts());

export const platformPrisma = globalForPrisma.onlyPadelPlatformPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.onlyPadelPlatformPrisma = platformPrisma;

