/**
 * Seed script — creates demo organization + admin user
 *
 * Usage: node prisma/seed.js
 * Credentials: admin@demo.org / password123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.info('Seeding database...');

  // Create demo org
  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      subdomain: 'demo.mededprep.app',
    },
  });

  console.info(`  Organization: ${org.name} (${org.slug})`);

  // Create admin user
  const password = await bcrypt.hash('password123', 12);
  const admin = await prisma.orgUser.upsert({
    where: { orgId_email: { orgId: org.id, email: 'admin@demo.org' } },
    update: {},
    create: {
      orgId: org.id,
      email: 'admin@demo.org',
      password,
      name: 'Admin User',
      role: 'owner',
    },
  });

  console.info(`  Admin: ${admin.email} / password123`);
  console.info('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
