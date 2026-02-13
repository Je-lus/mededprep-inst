#!/usr/bin/env node
/**
 * Create first admin user for an organization
 * Usage: node scripts/create-admin.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  // List orgs
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  if (orgs.length === 0) {
    console.info('No organizations found. Run: npm run create-org');
    process.exit(1);
  }

  console.info('Organizations:');
  orgs.forEach((o, i) => console.info(`  [${i}] ${o.name} (${o.slug})`));

  const orgIndex = await ask('Select org number: ');
  const org = orgs[Number(orgIndex)];
  if (!org) {
    console.info('Invalid selection');
    process.exit(1);
  }

  const name = await ask('Admin name: ');
  const email = await ask('Admin email: ');
  const rawPassword = await ask('Admin password (min 8 chars): ');

  if (rawPassword.length < 8) {
    console.info('Password must be at least 8 characters');
    process.exit(1);
  }

  const password = await bcrypt.hash(rawPassword, 12);

  const user = await prisma.orgUser.create({
    data: { orgId: org.id, email: email.toLowerCase(), password, name, role: 'owner' },
  });

  console.info(`\nAdmin user created:`);
  console.info(`  ID: ${user.id}`);
  console.info(`  Email: ${user.email}`);
  console.info(`  Role: owner`);
  console.info(`  Org: ${org.name}`);

  rl.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
