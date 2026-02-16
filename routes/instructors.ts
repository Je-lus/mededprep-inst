import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { z, validate } from '../lib/validate.js';

const router = Router();

const userSelect = {
  id: true,
  orgId: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

// ============================================
// SCHEMAS
// ============================================

const createInstructorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'owner']).default('admin'),
});

const updateInstructorSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'owner']).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// ROUTES
// ============================================

// GET / — List all org users
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.orgUser.findMany({
      where: { orgId: req.orgId },
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// POST / — Create a new instructor
router.post(
  '/',
  validate(createInstructorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, password, role } = req.body;

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.orgUser.create({
        data: {
          orgId: req.orgId,
          email: email.toLowerCase(),
          name,
          password: hashedPassword,
          role,
        },
        select: userSelect,
      });

      res.status(201).json({ success: true, data: user });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'A user with this email already exists' },
        });
        return;
      }
      next(error);
    }
  },
);

// PATCH /:id — Update an instructor
router.patch(
  '/:id',
  validate(updateInstructorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, email, role, isActive } = req.body;

      // Prevent owner from deactivating themselves
      if (id === req.user!.id && isActive === false) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'You cannot deactivate your own account' },
        });
        return;
      }

      const existing = await prisma.orgUser.findFirst({
        where: { id, orgId: req.orgId },
      });
      if (!existing) throw new NotFoundError('User not found');

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email.toLowerCase();
      if (role !== undefined) data.role = role;
      if (isActive !== undefined) data.isActive = isActive;

      const user = await prisma.orgUser.update({
        where: { id },
        data,
        select: userSelect,
      });

      res.json({ success: true, data: user });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'A user with this email already exists' },
        });
        return;
      }
      next(error);
    }
  },
);

// DELETE /:id — Deactivate an instructor (soft delete)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'You cannot deactivate your own account' },
      });
      return;
    }

    const existing = await prisma.orgUser.findFirst({
      where: { id, orgId: req.orgId },
    });
    if (!existing) throw new NotFoundError('User not found');

    await prisma.orgUser.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, data: { message: 'User deactivated' } });
  } catch (error) {
    next(error);
  }
});

export default router;
