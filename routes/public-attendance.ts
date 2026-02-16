import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { z, validate } from '../lib/validate.js';

const router = Router();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

// ============================================
// ATTENDANCE WINDOW HELPER
// ============================================

/**
 * Check if the current time falls within the allowed window for check-in or check-out.
 * - Check-in window: from 15 min before startDateTime to 60 min after startDateTime
 * - Check-out window: from 30 min before endDateTime to 60 min after endDateTime
 * - If no startDateTime/endDateTime configured, allow all day
 */
function getAttendanceWindow(
  session: { startDateTime: Date | null; endDateTime: Date | null },
  type: 'checkin' | 'checkout',
): { allowed: boolean; reason?: string } {
  const targetTime = type === 'checkin' ? session.startDateTime : session.endDateTime;
  if (!targetTime) {
    // No time configured — allow all day
    return { allowed: true };
  }

  const beforeMin = type === 'checkin' ? 15 : 30;
  const afterMin = type === 'checkin' ? 60 : 60;

  const now = new Date();
  const windowStart = new Date(new Date(targetTime).getTime() - beforeMin * 60000);
  const windowEnd = new Date(new Date(targetTime).getTime() + afterMin * 60000);

  if (now < windowStart) {
    return {
      allowed: false,
      reason: `${type === 'checkin' ? 'Check-in' : 'Check-out'} is not open yet. Opens at ${windowStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
    };
  }
  if (now > windowEnd) {
    return {
      allowed: false,
      reason: `${type === 'checkin' ? 'Check-in' : 'Check-out'} window has closed.`,
    };
  }

  return { allowed: true };
}

// ============================================
// GET SESSION INFO
// ============================================

// GET /attend/:hash — Get session info + check-in window status
router.get('/attend/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.session.findFirst({
      where: {
        publicHash: param(req.params.hash),
        orgId: req.orgId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDateTime: true,
        endDateTime: true,
        isPublished: true,
        org: { select: { name: true } },
      },
    });

    if (!session || !session.isPublished) {
      throw new NotFoundError('Session not found or not available');
    }

    const checkInWindow = getAttendanceWindow(session, 'checkin');
    const checkOutWindow = getAttendanceWindow(session, 'checkout');

    res.json({
      success: true,
      data: {
        ...session,
        checkInWindow: { allowed: checkInWindow.allowed, reason: checkInWindow.reason || null },
        checkOutWindow: { allowed: checkOutWindow.allowed, reason: checkOutWindow.reason || null },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// REGISTER + AUTO CHECK-IN
// ============================================

const registerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// POST /attend/:hash/register — Register + auto check-in
router.post(
  '/attend/:hash/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await prisma.session.findFirst({
        where: {
          publicHash: param(req.params.hash),
          orgId: req.orgId,
        },
      });

      if (!session || !session.isPublished) {
        throw new NotFoundError('Session not found or not available');
      }

      // Time window check for check-in
      const window = getAttendanceWindow(session, 'checkin');
      if (!window.allowed) {
        throw new ValidationError(window.reason!);
      }

      const { email, firstName, lastName } = req.body;

      // Find or create student
      let student = await prisma.student.findUnique({
        where: { orgId_email: { orgId: session.orgId, email: email.toLowerCase() } },
      });

      if (!student) {
        student = await prisma.student.create({
          data: {
            orgId: session.orgId,
            email: email.toLowerCase(),
            firstName,
            lastName,
          },
        });
      } else {
        // Update with any new info
        await prisma.student.update({
          where: { id: student.id },
          data: { firstName, lastName },
        });
      }

      // Create or find attendance record
      let attendee = await prisma.sessionAttendee.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
      });

      if (!attendee) {
        attendee = await prisma.sessionAttendee.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status: 'checked_in',
            checkedInAt: new Date(),
          },
        });
      }

      res.json({
        success: true,
        data: {
          studentId: student.id,
          attendeeId: attendee.id,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// RETURNING STUDENT LOOKUP
// ============================================

const lookupSchema = z.object({
  email: z.string().email(),
});

// POST /attend/:hash/lookup — Returning student email lookup
router.post(
  '/attend/:hash/lookup',
  validate(lookupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await prisma.session.findFirst({
        where: {
          publicHash: param(req.params.hash),
          orgId: req.orgId,
        },
      });

      if (!session || !session.isPublished) {
        throw new NotFoundError('Session not found');
      }

      const student = await prisma.student.findUnique({
        where: { orgId_email: { orgId: session.orgId, email: req.body.email.toLowerCase() } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!student) {
        return res.json({ success: true, data: { found: false } });
      }

      res.json({ success: true, data: { found: true, student } });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// SELF-SERVICE CHECK-OUT
// ============================================

const checkoutSchema = z.object({
  email: z.string().email(),
});

// POST /attend/:hash/checkout — Self-service checkout
router.post(
  '/attend/:hash/checkout',
  validate(checkoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await prisma.session.findFirst({
        where: {
          publicHash: param(req.params.hash),
          orgId: req.orgId,
        },
      });

      if (!session || !session.isPublished) {
        throw new NotFoundError('Session not found');
      }

      // Time window check
      const window = getAttendanceWindow(session, 'checkout');
      if (!window.allowed) {
        throw new ValidationError(window.reason!);
      }

      const student = await prisma.student.findUnique({
        where: { orgId_email: { orgId: session.orgId, email: req.body.email.toLowerCase() } },
      });

      if (!student) {
        throw new ValidationError('No record found for this email. Did you check in?');
      }

      const attendee = await prisma.sessionAttendee.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
      });

      if (!attendee) {
        throw new ValidationError('You are not checked in to this session.');
      }

      if (attendee.checkedOutAt) {
        return res.json({
          success: true,
          data: {
            alreadyCheckedOut: true,
            checkedOutAt: attendee.checkedOutAt,
            studentName: `${student.firstName} ${student.lastName}`,
          },
        });
      }

      const updated = await prisma.sessionAttendee.update({
        where: { id: attendee.id },
        data: { status: 'attended', checkedOutAt: new Date() },
      });

      res.json({
        success: true,
        data: {
          alreadyCheckedOut: false,
          checkedOutAt: updated.checkedOutAt,
          studentName: `${student.firstName} ${student.lastName}`,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
