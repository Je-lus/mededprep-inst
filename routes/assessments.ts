import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { z, validate, formatZodErrors } from '../lib/validate.js';
import { param } from '../lib/route-utils.js';
import { parseCsvToSurveyJson } from '../lib/services/csv-import.js';
import { computeItemAnalysis } from '../lib/services/item-analysis.js';
import { buildReviewQuestions } from '../lib/services/quiz-scoring.js';
import type { Prisma } from '@prisma/client';
import type { SurveyJson, SurveyElement } from '../types/survey.js';

const router = Router();

const createAssessmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  surveyJson: z.string().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  timeLimitMinutes: z.number().int().positive().optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeChoices: z.boolean().optional(),
  oneQuestionPerPage: z.boolean().optional(),
  showScoreFeedback: z.boolean().optional(),
  allowStudentReview: z.boolean().optional(),
});

const updateAssessmentSchema = createAssessmentSchema.partial();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const itemAnalysisPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const importCsvSchema = z.object({
  csvContent: z.string().min(1).max(1_048_576, 'CSV content exceeds 1MB limit'),
});

const releaseResultsSchema = z.object({
  released: z.boolean(),
});

const emptyBodySchema = z.object({}).strict();

function parseSurveyJsonOrThrow(surveyJson: string): SurveyJson {
  try {
    return JSON.parse(surveyJson) as SurveyJson;
  } catch {
    throw new ValidationError('surveyJson must be valid JSON');
  }
}

async function findAssessmentOrThrow(id: string, orgId: string, include?: Record<string, unknown>) {
  const assessment = await prisma.assessment.findFirst({
    where: { id, orgId },
    include,
  });

  if (!assessment) throw new NotFoundError('Assessment not found');
  return assessment;
}

function hasScoredQuestion(surveyJson: SurveyJson): boolean {
  for (const page of surveyJson?.pages || []) {
    for (const element of (page?.elements || []) as SurveyElement[]) {
      if (!('correctAnswer' in element)) continue;
      if (Array.isArray(element.correctAnswer)) {
        if (element.correctAnswer.length > 0) return true;
        continue;
      }
      if (element.correctAnswer !== null && String(element.correctAnswer).trim() !== '')
        return true;
    }
  }
  return false;
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orgId: true,
        createdById: true,
        title: true,
        description: true,
        surveyJson: true,
        status: true,
        publicHash: true,
        resultsReleased: true,
        passingScore: true,
        timeLimitMinutes: true,
        randomizeQuestions: true,
        randomizeChoices: true,
        oneQuestionPerPage: true,
        showScoreFeedback: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { responses: true } },
      },
    });

    res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  validate(createAssessmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        surveyJson,
        passingScore,
        timeLimitMinutes,
        randomizeQuestions,
        randomizeChoices,
        oneQuestionPerPage,
        showScoreFeedback,
        allowStudentReview,
      } = req.body;

      const assessment = await prisma.assessment.create({
        data: {
          orgId: req.orgId,
          createdById: req.user!.id,
          title,
          description,
          surveyJson: (surveyJson
            ? parseSurveyJsonOrThrow(surveyJson)
            : { pages: [] }) as unknown as Prisma.InputJsonValue,
          passingScore,
          timeLimitMinutes,
          randomizeQuestions,
          randomizeChoices,
          oneQuestionPerPage,
          showScoreFeedback,
          allowStudentReview,
        },
      });

      res.json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/parse-csv',
  validate(importCsvSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { surveyJson, questionCount, warnings } = parseCsvToSurveyJson(req.body.csvContent);
      res.json({ success: true, data: { surveyJson, questionCount, warnings } });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId, {
      _count: { select: { responses: true } },
    });

    res.json({
      success: true,
      data: {
        ...assessment,
        showScoreFeedback: assessment.showScoreFeedback ?? false,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  validate(updateAssessmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

      const updateKeys = Object.keys(req.body);
      if (assessment.status !== 'draft' && updateKeys.length > 0) {
        const allowed = new Set([
          'title',
          'description',
          'allowStudentReview',
          'resultsReleased',
          'showScoreFeedback',
        ]);
        const hasDisallowedField = updateKeys.some((key) => !allowed.has(key));
        if (hasDisallowedField) {
          throw new ValidationError(
            "Only 'title' and 'description' can be updated when assessment is not in draft status",
          );
        }
      }

      const { surveyJson, ...rest } = req.body;
      const updated = await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          ...rest,
          ...(surveyJson !== undefined ? { surveyJson: parseSurveyJsonOrThrow(surveyJson) } : {}),
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

    if (assessment.status !== 'draft') {
      throw new ValidationError('Only draft assessments can be deleted');
    }

    await prisma.assessment.delete({ where: { id: assessment.id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/publish',
  validate(emptyBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

      if (!hasScoredQuestion(assessment.surveyJson as SurveyJson)) {
        throw new ValidationError(
          'Assessment must contain at least one question with a correctAnswer',
        );
      }

      const updated = await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'active' },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/close',
  validate(emptyBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

      const updated = await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'closed' },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/reactivate',
  validate(emptyBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

      if (assessment.status !== 'closed') {
        throw new ValidationError('Only closed assessments can be reactivated');
      }

      const updated = await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'active' },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/import-csv',
  validate(importCsvSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);
      if (assessment.status !== 'draft') {
        throw new ValidationError('CSV import is only allowed for draft assessments');
      }

      const { surveyJson, questionCount, warnings } = parseCsvToSurveyJson(req.body.csvContent);

      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { surveyJson: surveyJson as unknown as Prisma.InputJsonValue },
      });

      res.json({ success: true, data: { questionCount, warnings } });
    } catch (error) {
      next(error);
    }
  },
);

// In-memory QR code cache keyed by publicHash, with TTL eviction
const QR_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const qrCodeCache = new Map<string, { url: string; qrCode: string; cachedAt: number }>();

// Periodic cleanup of expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of qrCodeCache) {
      if (now - entry.cachedAt > QR_CACHE_TTL_MS) {
        qrCodeCache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
).unref();

router.get('/:id/qr-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

    if (assessment.status !== 'active') {
      throw new ValidationError('QR code can only be generated for active assessments');
    }

    const cached = qrCodeCache.get(assessment.publicHash);
    if (cached) {
      if (Date.now() - cached.cachedAt > QR_CACHE_TTL_MS) {
        qrCodeCache.delete(assessment.publicHash);
      } else {
        return res.json({ success: true, data: { url: cached.url, qrCode: cached.qrCode } });
      }
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:9000';
    const url = `${baseUrl}/take/${assessment.publicHash}`;

    const qrCode = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const data = { url, qrCode };
    qrCodeCache.set(assessment.publicHash, { ...data, cachedAt: Date.now() });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/responses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      assessmentId: assessment.id,
      assessment: { orgId: req.orgId },
    };
    const [responses, total] = await Promise.all([
      prisma.assessmentResponse.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          assessmentId: true,
          studentId: true,
          studentEmail: true,
          studentName: true,
          totalQuestions: true,
          totalCorrect: true,
          scorePercentage: true,
          passed: true,
          timeTaken: true,
          startedAt: true,
          completedAt: true,
          responseData: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.assessmentResponse.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: responses,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('Invalid query parameters', formatZodErrors(error)));
    }
    next(error);
  }
});

router.get(
  '/:id/responses/:responseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);
      const responseId = param(req.params.responseId);

      const response = await prisma.assessmentResponse.findFirst({
        where: {
          id: responseId,
          assessmentId: assessment.id,
          assessment: { orgId: req.orgId },
        },
        select: {
          id: true,
          studentName: true,
          studentEmail: true,
          scorePercentage: true,
          totalCorrect: true,
          totalQuestions: true,
          passed: true,
          timeTaken: true,
          completedAt: true,
          responseData: true,
          questionTimings: true,
        },
      });

      if (!response) {
        throw new NotFoundError('Response not found');
      }

      const questions = buildReviewQuestions(
        assessment.surveyJson as SurveyJson,
        response.responseData as Record<string, unknown>,
      );

      res.json({
        success: true,
        data: {
          response: {
            id: response.id,
            studentName: response.studentName,
            studentEmail: response.studentEmail,
            scorePercentage: response.scorePercentage,
            totalCorrect: response.totalCorrect,
            totalQuestions: response.totalQuestions,
            passed: response.passed,
            timeTaken: response.timeTaken,
            completedAt: response.completedAt,
            questionTimings: response.questionTimings,
          },
          questions,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/:id/item-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);
    const { page, limit } = itemAnalysisPaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      assessmentId: assessment.id,
      assessment: { orgId: req.orgId },
    };

    const [allResponses, total] = await Promise.all([
      prisma.assessmentResponse.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.assessmentResponse.count({ where }),
    ]);

    const latestByStudent = new Map<string, (typeof allResponses)[number]>();
    for (const response of allResponses) {
      const key = response.studentEmail;
      const existing = latestByStudent.get(key);
      if (!existing) {
        latestByStudent.set(key, response);
        continue;
      }

      const responseAttempt = response.attempt ?? Number.NEGATIVE_INFINITY;
      const existingAttempt = existing.attempt ?? Number.NEGATIVE_INFINITY;
      if (responseAttempt > existingAttempt) {
        latestByStudent.set(key, response);
        continue;
      }
      if (responseAttempt < existingAttempt) {
        continue;
      }

      const responseCompletedAt = response.completedAt?.getTime?.() ?? 0;
      const existingCompletedAt = existing.completedAt?.getTime?.() ?? 0;
      if (responseCompletedAt > existingCompletedAt) {
        latestByStudent.set(key, response);
      }
    }
    const latestResponses = [...latestByStudent.values()].map((response) => ({
      responseData: response.responseData as Record<string, unknown>,
      questionTimings: response.questionTimings as Record<string, number> | null,
    }));

    const analysis = computeItemAnalysis(assessment.surveyJson as SurveyJson, latestResponses);
    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: analysis,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('Invalid query parameters', formatZodErrors(error)));
    }
    next(error);
  }
});

router.put(
  '/:id/release-results',
  validate(releaseResultsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await findAssessmentOrThrow(param(req.params.id), req.orgId);

      const updated = await prisma.assessment.update({
        where: { id: assessment.id },
        data: { resultsReleased: req.body.released },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
