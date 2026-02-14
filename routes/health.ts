/**
 * Health Check Routes
 *
 * Mounted BEFORE tenant resolution — no auth or subdomain required.
 *
 * Endpoints:
 *   GET /health          - Basic liveness check (fast, minimal overhead)
 *   GET /health/db       - Database connectivity check
 *   GET /health/detailed - Comprehensive system diagnostics
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { createRequire } from 'module';
import os from 'os';
import { prisma } from '../lib/prisma.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const router = Router();

/**
 * GET /health — basic liveness check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version,
  });
});

/**
 * GET /health/db — checks database connectivity
 */
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version,
      database: {
        status: 'connected',
        responseTime: `${responseTime}ms`,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version,
      database: {
        status: 'error',
        error: (err as Error).message,
      },
    });
  }
});

/**
 * GET /health/detailed — comprehensive system diagnostics
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  const memUsage = process.memoryUsage();
  const systemMem = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem(),
  };

  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;
  const loadAvg = os.loadavg();

  let dbStatus: string;
  let dbResponseTime: number | null = null;
  let dbError: string | null = null;

  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbResponseTime = Date.now() - dbStartTime;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
    dbError = (err as Error).message;
  }

  const totalResponseTime = Date.now() - startTime;

  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version,
    environment: process.env.NODE_ENV || 'development',

    process: {
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
    },

    memory: {
      process: {
        heapUsed: `${toMB(memUsage.heapUsed)} MB`,
        heapTotal: `${toMB(memUsage.heapTotal)} MB`,
        rss: `${toMB(memUsage.rss)} MB`,
      },
      system: {
        total: `${toMB(systemMem.total)} MB`,
        free: `${toMB(systemMem.free)} MB`,
        usagePercent: `${Math.round((systemMem.used / systemMem.total) * 100)}%`,
      },
    },

    cpu: {
      loadAverage: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100,
      },
      cores: os.cpus().length,
    },

    database: {
      status: dbStatus,
      responseTime: dbResponseTime ? `${dbResponseTime}ms` : null,
      error: dbError,
    },

    responseTime: `${totalResponseTime}ms`,
  });
});

export default router;
