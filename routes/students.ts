import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { z, validate, formatZodErrors } from '../lib/validate.js';
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

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

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

// GET / — List students for this org (paginated)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = { orgId: req.orgId };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          ...studentSelect,
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.student.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: students.map((s) => ({
        ...s,
        hasPassword: false, // never expose password info
        responseCount: s._count.responses,
        _count: undefined,
      })),
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('Invalid query parameters', formatZodErrors(error)));
    }
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
