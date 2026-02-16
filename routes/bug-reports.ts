/**
 * Bug Report Routes
 * POST /api/bug-reports      - Submit bug report (no auth required, but identity detected)
 * GET  /api/bug-reports      - List bug reports (admin only)
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { validate, validateQuery, z } from '../lib/validate.js';
import { uploadImage, isImageKitConfigured } from '../lib/imagekit.js';

const router = express.Router();

const createBugReportSchema = z.object({
  category: z.enum(['bug', 'feedback', 'feature_request']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  stepsToReproduce: z.string().max(5000).optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  viewport: z.string().optional(),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
  screenshot: z.string().optional(), // base64 data
});

const listBugReportsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'acknowledged', 'resolved', 'closed']).optional(),
});

/**
 * POST /api/bug-reports - Submit bug report
 * No auth required, but identity detected via optionalAuth middleware
 */
router.post(
  '/',
  validate(createBugReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        category,
        severity,
        description,
        stepsToReproduce,
        url,
        userAgent,
        viewport,
        errorMessage,
        errorStack,
        screenshot,
      } = req.body;

      // Handle screenshot upload to ImageKit if provided
      let screenshotUrl: string | null = null;
      if (screenshot && isImageKitConfigured()) {
        try {
          // Decode base64 screenshot (strip data URL prefix if present)
          const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          // Upload to ImageKit
          const timestamp = Date.now();
          const fileName = `screenshot-${timestamp}`;
          const folder = `/bug-reports/${req.orgId}`;
          const result = await uploadImage(buffer, fileName, folder);

          if (result) {
            screenshotUrl = result.url;
          }
        } catch (error) {
          // Log error but don't fail the request
          req.log?.error({ error }, 'Failed to upload screenshot');
        }
      }

      // Detect reporter identity from optionalAuth
      let reporterType: 'admin' | 'student' | 'anonymous' = 'anonymous';
      let reporterId: string | null = null;
      let reporterEmail: string | null = null;
      let reporterName: string | null = null;

      if (req.user) {
        reporterType = 'admin';
        reporterId = req.user.id;
        reporterEmail = req.user.email;
        reporterName = req.user.name;
      } else if (req.student) {
        reporterType = 'student';
        reporterId = req.student.id;
        reporterEmail = req.student.email;
        reporterName = `${req.student.firstName} ${req.student.lastName}`;
      }

      // Create bug report
      const bugReport = await prisma.bugReport.create({
        data: {
          orgId: req.orgId,
          reporterType,
          reporterId,
          reporterEmail,
          reporterName,
          category,
          severity,
          description,
          stepsToReproduce,
          url,
          userAgent,
          viewport,
          errorMessage,
          errorStack,
          screenshotUrl,
          status: 'pending',
        },
        select: {
          id: true,
          category: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: bugReport,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/bug-reports - List bug reports (admin only)
 */
router.get(
  '/',
  requireAuth,
  validateQuery(listBugReportsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status } = req.query as {
        page: number;
        limit: number;
        status?: 'pending' | 'acknowledged' | 'resolved' | 'closed';
      };

      const skip = (page - 1) * limit;

      const where = {
        orgId: req.orgId,
        ...(status && { status }),
      };

      const [reports, total] = await Promise.all([
        prisma.bugReport.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.bugReport.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: reports,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
