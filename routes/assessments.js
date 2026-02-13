import { Router } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { z, validate } from '../lib/validate.js';
import { parseCsvToSurveyJson } from '../lib/services/csv-import.js';
import { computeItemAnalysis } from '../lib/services/item-analysis.js';

const router = Router();

const createAssessmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  surveyJson: z.string().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  timeLimitMinutes: z.number().int().positive().optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeChoices: z.boolean().optional(),
});

const updateAssessmentSchema = createAssessmentSchema.partial();

const importCsvSchema = z.object({
  csvContent: z.string().min(1),
});

const releaseResultsSchema = z.object({
  released: z.boolean(),
});

const emptyBodySchema = z.object({}).strict();

function parseSurveyJsonOrThrow(surveyJson) {
  try {
    return JSON.parse(surveyJson);
  } catch {
    throw new ValidationError('surveyJson must be valid JSON');
  }
}

async function findAssessmentOrThrow(id, orgId, include = undefined) {
  const assessment = await prisma.assessment.findFirst({
    where: { id, orgId },
    include,
  });

  if (!assessment) throw new NotFoundError('Assessment not found');
  return assessment;
}

function hasScoredQuestion(surveyJson) {
  for (const page of surveyJson?.pages || []) {
    for (const element of page?.elements || []) {
      if (!('correctAnswer' in element)) continue;
      if (Array.isArray(element.correctAnswer)) {
        if (element.correctAnswer.length > 0) return true;
        continue;
      }
      if (element.correctAnswer !== null && String(element.correctAnswer).trim() !== '') return true;
    }
  }
  return false;
}

router.get('/', async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    });

    res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createAssessmentSchema), async (req, res, next) => {
  try {
    const {
      title,
      description,
      surveyJson,
      passingScore,
      timeLimitMinutes,
      randomizeQuestions,
      randomizeChoices,
    } = req.body;

    const assessment = await prisma.assessment.create({
      data: {
        orgId: req.orgId,
        createdById: req.user.id,
        title,
        description,
        surveyJson: surveyJson ? parseSurveyJsonOrThrow(surveyJson) : { pages: [] },
        passingScore,
        timeLimitMinutes,
        randomizeQuestions,
        randomizeChoices,
      },
    });

    res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId, {
      _count: { select: { responses: true } },
    });

    res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(updateAssessmentSchema), async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    const updateKeys = Object.keys(req.body);
    if (assessment.status !== 'draft' && updateKeys.length > 0) {
      const allowed = new Set(['title', 'description']);
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
});

router.delete('/:id', async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    if (assessment.status !== 'draft') {
      throw new ValidationError('Only draft assessments can be deleted');
    }

    await prisma.assessment.delete({ where: { id: assessment.id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/publish', validate(emptyBodySchema), async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    if (!hasScoredQuestion(assessment.surveyJson)) {
      throw new ValidationError('Assessment must contain at least one question with a correctAnswer');
    }

    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: 'active' },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/close', validate(emptyBodySchema), async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: 'closed' },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/import-csv', validate(importCsvSchema), async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);
    if (assessment.status !== 'draft') {
      throw new ValidationError('CSV import is only allowed for draft assessments');
    }

    const { surveyJson, questionCount } = parseCsvToSurveyJson(req.body.csvContent);

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { surveyJson },
    });

    res.json({ success: true, data: { questionCount } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/qr-code', async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    if (assessment.status !== 'active') {
      throw new ValidationError('QR code can only be generated for active assessments');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !req.org?.subdomain) {
      throw new ValidationError('Organization subdomain is required in production');
    }

    const url = isProduction
      ? `https://${req.org.subdomain}.mededprep.app/take/${assessment.publicHash}`
      : `http://localhost:9000/take/${assessment.publicHash}`;

    const qrCode = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({ success: true, data: { url, qrCode } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/responses', async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    const responses = await prisma.assessmentResponse.findMany({
      where: {
        assessmentId: assessment.id,
        assessment: { orgId: req.orgId },
      },
      orderBy: { completedAt: 'desc' },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: responses });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/item-analysis', async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    const responses = await prisma.assessmentResponse.findMany({
      where: {
        assessmentId: assessment.id,
        assessment: { orgId: req.orgId },
      },
      select: { responseData: true },
    });

    const analysis = computeItemAnalysis(assessment.surveyJson, responses);
    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/release-results', validate(releaseResultsSchema), async (req, res, next) => {
  try {
    const assessment = await findAssessmentOrThrow(req.params.id, req.orgId);

    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: { resultsReleased: req.body.released },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
