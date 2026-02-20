import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import {
  generateStudentToken,
  setAuthCookie,
  clearAuthCookie,
  requireStudentAuth,
} from '../lib/auth.js';
import { z, validate, formatZodErrors } from '../lib/validate.js';
import { param } from '../lib/route-utils.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors.js';
import type { SurveyJson } from '../types/survey.js';
import { buildReviewQuestions } from '../lib/services/quiz-scoring.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.body.email.toLowerCase();
      const passwordHash = await bcrypt.hash(req.body.password, 12);

      const existingStudent = await prisma.student.findUnique({
        where: {
          orgId_email: {
            orgId: req.orgId,
            email,
          },
        },
      });

      const verificationToken = crypto.randomUUID();

      let student;
      if (existingStudent?.password) {
        throw new ValidationError('Account already exists. Please log in.');
      } else if (existingStudent) {
        student = await prisma.student.update({
          where: { id: existingStudent.id },
          data: {
            firstName: req.body.firstName.trim(),
            lastName: req.body.lastName.trim(),
            password: passwordHash,
            emailVerified: false,
            verificationToken,
          },
        });
      } else {
        student = await prisma.student.create({
          data: {
            orgId: req.orgId,
            email,
            firstName: req.body.firstName.trim(),
            lastName: req.body.lastName.trim(),
            password: passwordHash,
            emailVerified: false,
            verificationToken,
          },
        });
      }

      await prisma.assessmentResponse.updateMany({
        where: {
          studentEmail: email,
          studentId: null,
          assessment: {
            orgId: req.orgId,
          },
        },
        data: {
          studentId: student.id,
        },
      });

      // TODO: In production, send a verification email with a link containing the verificationToken
      // instead of returning it in the response.

      const token = generateStudentToken(student);
      setAuthCookie(res, 'student-token', token);

      return res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
            orgId: student.orgId,
            emailVerified: student.emailVerified,
          },
          // DEV ONLY: In production, this token would be sent via email
          verificationToken,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.body.email.toLowerCase();
      const { password } = req.body;

      const student = await prisma.student.findUnique({
        where: {
          orgId_email: {
            orgId: req.orgId,
            email,
          },
        },
      });

      if (!student || !student.password || !student.isActive) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, student.password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const token = generateStudentToken(student);
      setAuthCookie(res, 'student-token', token);

      return res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
            orgId: student.orgId,
            emailVerified: student.emailVerified,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res, 'student-token');
  return res.json({ success: true, data: { loggedOut: true } });
});

router.post('/refresh', requireStudentAuth, (req: Request, res: Response) => {
  const student = req.student!;
  const token = generateStudentToken(student);
  setAuthCookie(res, 'student-token', token);
  return res.json({
    success: true,
    data: {
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    },
  });
});

router.get('/me', requireStudentAuth, (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      student: req.student,
    },
  });
});

router.get(
  '/stats',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const where = {
        studentId: req.student!.id,
        completedAt: { not: null },
        assessment: { orgId: req.orgId },
      };

      const [aggregations, passedCount] = await Promise.all([
        prisma.assessmentResponse.aggregate({
          where,
          _count: { id: true },
          _avg: { scorePercentage: true },
          _max: { scorePercentage: true },
        }),
        prisma.assessmentResponse.count({
          where: { ...where, passed: true },
        }),
      ]);

      const totalCompleted = aggregations._count.id;
      const averageScore = aggregations._avg.scorePercentage
        ? Number(aggregations._avg.scorePercentage)
        : 0;
      const bestScore = aggregations._max.scorePercentage
        ? Number(aggregations._max.scorePercentage)
        : 0;
      const passRate = totalCompleted > 0 ? (passedCount / totalCompleted) * 100 : 0;

      return res.json({
        success: true,
        data: {
          totalCompleted,
          averageScore: Math.round(averageScore * 100) / 100,
          bestScore: Math.round(bestScore * 100) / 100,
          passRate: Math.round(passRate * 100) / 100,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  '/assessments',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const skip = (page - 1) * limit;
      const where = {
        studentId: req.student!.id,
        completedAt: {
          not: null,
        },
        assessment: {
          orgId: req.orgId,
        },
      };
      const [responses, total] = await Promise.all([
        prisma.assessmentResponse.findMany({
          where,
          select: {
            id: true,
            assessmentId: true,
            attempt: true,
            scorePercentage: true,
            passed: true,
            completedAt: true,
            assessment: {
              select: {
                title: true,
                resultsReleased: true,
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
          take: limit,
          skip,
        }),
        prisma.assessmentResponse.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true,
        data: responses.map((response) => ({
          id: response.id,
          assessmentId: response.assessmentId,
          attempt: response.attempt,
          assessmentTitle: response.assessment.title,
          scorePercentage: response.scorePercentage,
          passed: response.passed,
          completedAt: response.completedAt,
          resultsReleased: response.assessment.resultsReleased,
        })),
        pagination: { page, limit, total, totalPages },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError('Invalid query parameters', formatZodErrors(error)));
      }
      return next(error);
    }
  },
);

router.get(
  '/assessments/:id/review',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await prisma.assessmentResponse.findFirst({
        where: {
          id: param(req.params.id),
          studentId: req.student!.id,
          assessment: {
            orgId: req.orgId,
          },
        },
        select: {
          totalQuestions: true,
          totalCorrect: true,
          scorePercentage: true,
          responseData: true,
          assessment: {
            select: {
              title: true,
              description: true,
              resultsReleased: true,
              allowStudentReview: true,
              surveyJson: true,
            },
          },
        },
      });

      if (!response) {
        throw new NotFoundError('Assessment response not found');
      }

      if (!response.assessment.resultsReleased) {
        throw new ValidationError('Results have not been released yet');
      }

      const isReviewAllowed = Boolean(response.assessment.allowStudentReview);
      if (!isReviewAllowed) {
        // Students are not permitted to review this assessment yet.
        return res.status(403).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_ALLOWED',
            message: 'The instructor has not enabled review for this assessment.',
          },
        });
      }

      const questions = buildReviewQuestions(
        response.assessment.surveyJson as SurveyJson,
        response.responseData as Record<string, unknown>,
      );

      return res.json({
        success: true,
        data: {
          assessment: {
            title: response.assessment.title,
            description: response.assessment.description,
          },
          totalQuestions: response.totalQuestions ?? questions.length,
          totalCorrect:
            response.totalCorrect ??
            questions.reduce((count, question) => count + (question.isCorrect ? 1 : 0), 0),
          scorePercentage: response.scorePercentage,
          questions,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

// ============================================
// PASSWORD RESET
// ============================================

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.body.email.toLowerCase();

      const student = await prisma.student.findUnique({
        where: {
          orgId_email: {
            orgId: req.orgId,
            email,
          },
        },
      });

      let resetToken: string | undefined;

      if (student && student.password && student.isActive) {
        resetToken = crypto.randomUUID();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.student.update({
          where: { id: student.id },
          data: { resetToken, resetTokenExpiry },
        });

        // TODO: In production, send an email with a link containing the resetToken
        // (e.g., https://inst.mededprep.app/student/reset-password?token=<resetToken>)
        // instead of returning it in the response.
      }

      // Always return success to prevent email enumeration
      return res.json({
        success: true,
        data: {
          message: 'If an account exists, a reset link has been sent.',
          // DEV ONLY: In production, do NOT return the token in the response
          ...(resetToken && { resetToken }),
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      const student = await prisma.student.findFirst({
        where: {
          orgId: req.orgId,
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!student) {
        throw new ValidationError('Invalid or expired reset token.');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.student.update({
        where: { id: student.id },
        data: {
          password: passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return res.json({
        success: true,
        data: {
          message: 'Password has been reset successfully.',
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

// ============================================
// EMAIL VERIFICATION
// ============================================

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      const student = await prisma.student.findFirst({
        where: {
          orgId: req.orgId,
          verificationToken: token,
        },
      });

      if (!student) {
        throw new ValidationError('Invalid verification token.');
      }

      await prisma.student.update({
        where: { id: student.id },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      });

      return res.json({
        success: true,
        data: {
          message: 'Email verified successfully.',
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/resend-verification',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.student!.id },
      });

      if (!student) {
        throw new NotFoundError('Student not found.');
      }

      if (student.emailVerified) {
        return res.json({
          success: true,
          data: {
            message: 'Email is already verified.',
          },
        });
      }

      const verificationToken = crypto.randomUUID();

      await prisma.student.update({
        where: { id: student.id },
        data: { verificationToken },
      });

      // TODO: In production, send a verification email with a link containing the verificationToken
      // instead of returning it in the response.

      return res.json({
        success: true,
        data: {
          message: 'Verification link has been sent.',
          // DEV ONLY: In production, do NOT return the token in the response
          verificationToken,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
