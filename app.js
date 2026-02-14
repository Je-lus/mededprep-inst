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
import crypto from 'crypto';

import { logger } from './lib/logger.js';

import { tenantResolver } from './middleware/tenantResolver.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter, generalLimiter, submitLimiter } from './middleware/rate-limiter.js';

import { requireAuth } from './lib/auth.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import assessmentRoutes from './routes/assessments.js';
import publicRoutes from './routes/public.js';
import studentAuthRoutes from './routes/student-auth.js';

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
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
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
// TENANT RESOLVER (all API routes)
// ============================================

app.use('/api', tenantResolver);

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/assessments', generalLimiter, requireAuth, assessmentRoutes);
app.use('/api/public/assessment/:hash/submit', submitLimiter);
app.use('/api/public', generalLimiter, publicRoutes);
app.use('/api/student', authLimiter, studentAuthRoutes);

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorHandler);

export default app;
