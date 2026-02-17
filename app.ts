/**
 * MedEdPrep PRODUCT — Express App
 *
 * Separated from server.js for testability.
 * This module builds and exports the Express app without calling .listen().
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

import { logger } from './lib/logger.js';

import { tenantResolver } from './middleware/tenantResolver.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter, generalLimiter, submitLimiter } from './middleware/rate-limiter.js';
import { optionalAuth } from './middleware/optionalAuth.js';

import { requireAuth, requireRole } from './lib/auth.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import assessmentRoutes from './routes/assessments.js';
import questionBankRoutes from './routes/question-banks.js';
import publicRoutes from './routes/public.js';
import studentAuthRoutes from './routes/student-auth.js';
import bugReportRoutes from './routes/bug-reports.js';
import sessionRoutes from './routes/sessions.js';
import instructorRoutes from './routes/instructors.js';
import publicAttendanceRoutes from './routes/public-attendance.js';

const ALLOWED_ORIGINS = new Set((process.env.CORS_ORIGINS || 'http://localhost:9000').split(','));

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
      if (isDev && /^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      callback(new Error('CORS not allowed'), false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  (pinoHttp as unknown as typeof pinoHttp.default)({
    logger,
    genReqId: (req: IncomingMessage) =>
      (req.headers['x-request-id'] as string) || crypto.randomUUID(),
    autoLogging: {
      ignore: (req: IncomingMessage) => req.url === '/health',
    },
    customLogLevel: (_req: IncomingMessage, res: ServerResponse, err: Error | undefined) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    serializers: {
      req: (req: IncomingMessage) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);

// ============================================
// HEALTH CHECK (no auth, no tenant)
// ============================================

app.use('/health', healthRoutes);

// ============================================
// ORG-INDEPENDENT PUBLIC ROUTES (before tenant resolver)
// ============================================

app.use('/api/public', generalLimiter, publicAttendanceRoutes);

// ============================================
// TENANT RESOLVER (all remaining API routes)
// ============================================

app.use('/api', tenantResolver);

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/assessments', generalLimiter, requireAuth, assessmentRoutes);
app.use('/api/question-banks', generalLimiter, requireAuth, questionBankRoutes);
app.use('/api/sessions', generalLimiter, requireAuth, sessionRoutes);
app.use('/api/instructors', generalLimiter, requireAuth, requireRole('owner'), instructorRoutes);
app.use('/api/public/assessment/:hash/submit', submitLimiter);
app.use('/api/public', generalLimiter, publicRoutes);
app.use('/api/student', authLimiter, studentAuthRoutes);
app.use('/api/bug-reports', submitLimiter, optionalAuth, bugReportRoutes);

// ============================================
// STATIC FRONTEND (production)
// ============================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, 'app', 'dist');

app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api') || _req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorHandler);

export default app;
