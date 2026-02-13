/**
 * Prisma Client Singleton
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function gracefulDisconnect() {
  await prisma.$disconnect();
}
