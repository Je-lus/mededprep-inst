import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { z, validate } from '../lib/validate.js';
import { param } from '../lib/route-utils.js';

const router = Router();

const studentSelect = {
  id: true,
  orgId: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  password: false,
  createdAt: true,
  updatedAt: true,
};

// ============================================
// SCHEMAS
// ============================================

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const updateStudentSchema = z.object({
  isActive: z.boolean().optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
});

// ============================================
// ROUTES
// ============================================

// GET / — List all students for this org
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = await prisma.student.findMany({
      where: { orgId: req.orgId },
      select: {
        ...studentSelect,
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: students.map((s) => ({
        ...s,
        hasPassword: false, // never expose password info
        responseCount: s._count.responses,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id — Update a student (name, active status)
router.patch(
  '/:id',
  validate(updateStudentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = param(req.params.id);

      const existing = await prisma.student.findFirst({
        where: { id, orgId: req.orgId },
      });
      if (!existing) throw new NotFoundError('Student not found');

      const data: Record<string, unknown> = {};
      if (req.body.firstName !== undefined) data.firstName = req.body.firstName.trim();
      if (req.body.lastName !== undefined) data.lastName = req.body.lastName.trim();
      if (req.body.isActive !== undefined) data.isActive = req.body.isActive;

      const student = await prisma.student.update({
        where: { id },
        data,
        select: studentSelect,
      });

      res.json({ success: true, data: student });
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /:id/reset-password — Admin resets a student's password
router.patch(
  '/:id/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = param(req.params.id);
      const { password } = req.body;

      const existing = await prisma.student.findFirst({
        where: { id, orgId: req.orgId },
      });
      if (!existing) throw new NotFoundError('Student not found');

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.student.update({
        where: { id },
        data: { password: hashedPassword },
      });

      res.json({ success: true, data: { message: 'Password reset successfully' } });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
