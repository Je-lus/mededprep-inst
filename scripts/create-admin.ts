#!/usr/bin/env tsx
/**
 * Create first admin user for an organization
 * Usage: tsx scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));

async function main(): Promise<void> {
  // List orgs
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });

  console.info('Organizations:');
  orgs.forEach((o, i) => console.info(`  [${i}] ${o.name} (${o.slug})`));
  console.info(`  [${orgs.length}] [+] Create new organization`);

  const orgIndex = await ask('Select org number: ');
  const trimmedSelection = orgIndex.trim();
  const selectedIndex = Number(trimmedSelection);
  if (
    trimmedSelection === '' ||
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex > orgs.length
  ) {
    console.info('Invalid selection');
    process.exit(1);
  }

  let org = orgs[selectedIndex];
  if (selectedIndex === orgs.length) {
    const orgName = (await ask('Organization name: ')).trim();
    const orgSlug = (await ask('Organization slug: ')).trim();

    if (!orgName || !orgSlug) {
      console.info('Organization name and slug are required');
      process.exit(1);
    }

    if (orgs.some((existing) => existing.slug === orgSlug)) {
      console.info('Organization slug already exists');
      process.exit(1);
    }

    org = await prisma.organization.create({
      data: { name: orgName, slug: orgSlug },
      select: { id: true, name: true, slug: true },
    });
    console.info(`Created organization: ${org.name} (${org.slug})`);
  }

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
