/**
 * Admin Auth Routes
 * POST /api/auth/login
 * GET  /api/auth/me
 * POST /api/auth/logout
 * POST /api/auth/refresh
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateToken, requireAuth, setAuthCookie, clearAuthCookie } from '../lib/auth.js';
import { validate, z } from '../lib/validate.js';
import { UnauthorizedError } from '../lib/errors.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.orgUser.findUnique({
        where: { orgId_email: { orgId: req.orgId, email: email.toLowerCase() } },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login
      await prisma.orgUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = generateToken(user);
      setAuthCookie(res, 'admin-token', token);
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: user.orgId,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.orgUser.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, orgId: true },
  });
  res.json({
    success: true,
    data: {
      user,
      org: {
        id: req.org.id,
        name: req.org.name,
        slug: req.org.slug,
      },
    },
  });
});

router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res, 'admin-token');
  res.json({ success: true, data: { message: 'Logged out' } });
});

router.post('/refresh', requireAuth, (req: Request, res: Response) => {
  const token = generateToken(req.user!);
  setAuthCookie(res, 'admin-token', token);
  res.json({ success: true, data: { user: req.user } });
});

export default router;
