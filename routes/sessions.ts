import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { z, validate } from '../lib/validate.js';
import { param } from '../lib/route-utils.js';

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

async function findSessionOrThrow(id: string, orgId: string, include?: Record<string, unknown>) {
  const session = await prisma.session.findFirst({
    where: { id, orgId },
    include,
  });

  if (!session) throw new NotFoundError('Session not found');
  return session;
}

// ============================================
// SESSION CRUD
// ============================================

const createSessionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
});

const updateSessionSchema = createSessionSchema.partial();

// GET / — List sessions with attendee counts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { attendees: true },
        },
      },
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

// POST / — Create session
router.post(
  '/',
  validate(createSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, startDateTime, endDateTime } = req.body;

      const session = await prisma.session.create({
        data: {
          orgId: req.orgId!,
          createdById: req.user!.id,
          name,
          description,
          startDateTime: startDateTime ? new Date(startDateTime) : null,
          endDateTime: endDateTime ? new Date(endDateTime) : null,
        },
      });

      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  },
);

// GET /:id — Get session with attendee list
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await findSessionOrThrow(param(req.params.id), req.orgId!, {
      attendees: {
        include: {
          student: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// PUT /:id — Update session
router.put(
  '/:id',
  validate(updateSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await findSessionOrThrow(param(req.params.id), req.orgId!);

      const { name, description, startDateTime, endDateTime } = req.body;
      const data: Record<string, unknown> = {};

      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (startDateTime !== undefined)
        data.startDateTime = startDateTime ? new Date(startDateTime) : null;
      if (endDateTime !== undefined) data.endDateTime = endDateTime ? new Date(endDateTime) : null;

      const session = await prisma.session.update({
        where: { id: param(req.params.id) },
        data,
      });

      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /:id — Delete session (cascade deletes attendees)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findSessionOrThrow(param(req.params.id), req.orgId!);

    await prisma.session.delete({
      where: { id: param(req.params.id) },
    });

    res.json({ success: true, data: { message: 'Session deleted' } });
  } catch (error) {
    next(error);
  }
});

// POST /:id/publish — Set isPublished=true
router.post('/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findSessionOrThrow(param(req.params.id), req.orgId!);

    const session = await prisma.session.update({
      where: { id: param(req.params.id) },
      data: { isPublished: true },
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ATTENDEE MANAGEMENT
// ============================================

// GET /:id/attendees — List attendees
router.get('/:id/attendees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findSessionOrThrow(param(req.params.id), req.orgId!);

    const attendees = await prisma.sessionAttendee.findMany({
      where: { sessionId: param(req.params.id) },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: attendees });
  } catch (error) {
    next(error);
  }
});

// POST /:id/attendees — Add attendee manually
const addAttendeeSchema = z.object({
  studentId: z.string(),
});

router.post(
  '/:id/attendees',
  validate(addAttendeeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await findSessionOrThrow(param(req.params.id), req.orgId!);

      const attendee = await prisma.sessionAttendee.create({
        data: {
          sessionId: param(req.params.id),
          studentId: req.body.studentId,
        },
        include: {
          student: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.json({ success: true, data: attendee });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /:id/attendees/:aid — Update attendee status/notes
const updateAttendeeSchema = z.object({
  status: z.enum(['registered', 'checked_in', 'attended', 'no_show', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
});

router.put(
  '/:id/attendees/:aid',
  validate(updateAttendeeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await findSessionOrThrow(param(req.params.id), req.orgId!);

      // Verify attendee belongs to this session
      const existing = await prisma.sessionAttendee.findFirst({
        where: { id: param(req.params.aid), sessionId: param(req.params.id) },
      });
      if (!existing) throw new NotFoundError('Attendee not found');

      const data: Record<string, unknown> = { ...req.body };
      if (data.status === 'checked_in') {
        data.checkedInAt = new Date();
      }

      const attendee = await prisma.sessionAttendee.update({
        where: { id: param(req.params.aid) },
        data,
      });

      res.json({ success: true, data: attendee });
    } catch (error) {
      next(error);
    }
  },
);

// POST /:id/attendees/:aid/check-in — Manual check-in
router.post(
  '/:id/attendees/:aid/check-in',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await findSessionOrThrow(param(req.params.id), req.orgId!);

      // Verify attendee belongs to this session
      const existing = await prisma.sessionAttendee.findFirst({
        where: { id: param(req.params.aid), sessionId: param(req.params.id) },
      });
      if (!existing) throw new NotFoundError('Attendee not found');

      const attendee = await prisma.sessionAttendee.update({
        where: { id: param(req.params.aid) },
        data: {
          status: 'checked_in',
          checkedInAt: new Date(),
        },
      });

      res.json({ success: true, data: attendee });
    } catch (error) {
      next(error);
    }
  },
);

// POST /:id/attendees/:aid/check-out — Manual check-out
router.post(
  '/:id/attendees/:aid/check-out',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await findSessionOrThrow(param(req.params.id), req.orgId!);

      const existing = await prisma.sessionAttendee.findFirst({
        where: { id: param(req.params.aid), sessionId: param(req.params.id) },
      });
      if (!existing) throw new NotFoundError('Attendee not found');

      const attendee = await prisma.sessionAttendee.update({
        where: { id: param(req.params.aid) },
        data: {
          status: 'attended',
          checkedOutAt: new Date(),
        },
      });

      res.json({ success: true, data: attendee });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// QR CODES FOR CHECK-IN / CHECK-OUT
// ============================================

// GET /:id/qr-codes — Generate check-in + checkout QR codes
router.get('/:id/qr-codes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await findSessionOrThrow(param(req.params.id), req.orgId!);

    const org = await prisma.organization.findUnique({
      where: { id: req.orgId },
      select: { subdomain: true },
    });

    // Build base URL from org subdomain
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? `https://${org!.subdomain}.mededprep.app`
        : `http://localhost:9000`;

    const checkInUrl = `${baseUrl}/attend/${session.publicHash}`;
    const checkOutUrl = `${baseUrl}/attend/${session.publicHash}/checkout`;

    const [checkInQr, checkOutQr] = await Promise.all([
      QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }),
      QRCode.toDataURL(checkOutUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        checkIn: { url: checkInUrl, qrCode: checkInQr },
        checkOut: { url: checkOutUrl, qrCode: checkOutQr },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
