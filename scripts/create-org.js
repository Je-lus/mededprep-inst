#!/usr/bin/env node
/**
 * Create a new organization
 * Usage: node scripts/create-org.js
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  const name = await ask('Organization name: ');
  const slug = await ask('Slug (e.g., demo): ');
  const subdomain =
    (await ask(`Subdomain (e.g., ${slug}.mededprep.app): `)) || `${slug}.mededprep.app`;

  const org = await prisma.organization.create({
    data: { name, slug, subdomain },
  });

  console.info(`\nOrganization created:`);
  console.info(`  ID: ${org.id}`);
  console.info(`  Name: ${org.name}`);
  console.info(`  Slug: ${org.slug}`);
  console.info(`  Subdomain: ${org.subdomain}`);
  console.info(`\nNext: npm run create-admin`);

  rl.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
