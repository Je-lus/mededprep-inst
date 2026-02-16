/**
 * MedEdPrep Instructor Tools — Express Server
 */

// Validate required env vars before anything else
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long for security');
  console.error(`Current length: ${process.env.JWT_SECRET.length}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

import app from './app.js';
import { gracefulDisconnect } from './lib/prisma.js';
import { logger } from './lib/logger.js';

const PORT = process.env.PORT || 8179;

// Trust first proxy (Nginx) so req.ip returns the real client IP
app.set('trust proxy', 1);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'MedEdPrep Instructor Tools server started');
});

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down...');
  await gracefulDisconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
