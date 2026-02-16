import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { z, validate } from '../lib/validate.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { scoreSurveyResponse, stripSensitiveData } from '../lib/services/quiz-scoring.js';
import { randomizeAssessment } from '../lib/services/randomization.js';
import type { SurveyJson, SurveyElement } from '../types/survey.js';

/** Express route params are always strings; cast from string | string[] */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const router = Router();

const startAssessmentSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  studentEmail: z.string().email(),
});

const submitAssessmentSchema = z.object({
  responseId: z.string(),
  responseData: z.record(z.string(), z.unknown()),
  timeTaken: z.number().int().optional(),
});

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getGradableElements(surveyJson: SurveyJson): SurveyElement[] {
  const elements: SurveyElement[] = [];

  for (const page of surveyJson?.pages || []) {
    for (const element of (page?.elements || []) as SurveyElement[]) {
      if (element && typeof element === 'object' && 'correctAnswer' in element) {
        elements.push(element);
      }
    }
  }

  return elements;
}

function applyTimerConfig(surveyJson: SurveyJson, timeLimitMinutes: number | null): SurveyJson {
  if (timeLimitMinutes) {
    surveyJson.showTimer = true;
    surveyJson.timeLimit = timeLimitMinutes * 60;
  }
  return surveyJson;
}

function buildResumedSurveyJson(
  originalSurveyJson: SurveyJson,
  questionOrder: unknown,
): SurveyJson {
  const baseJson = cloneJson(originalSurveyJson);
  const gradableElements = getGradableElements(baseJson);
  const elementByName = new Map<string, SurveyElement>();

  for (const element of gradableElements) {
    if (element?.name) {
      elementByName.set(element.name, element);
    }
  }

  const seen = new Set<string>();
  const orderedElements: SurveyElement[] = [];

  if (Array.isArray(questionOrder)) {
    for (const questionName of questionOrder) {
      const element = elementByName.get(questionName as string);
      if (!element) continue;
      orderedElements.push(element);
      seen.add(questionName as string);
    }
  }

  for (const element of gradableElements) {
    if (!element?.name || seen.has(element.name)) continue;
    orderedElements.push(element);
  }

  return {
    ...baseJson,
    pages: [{ name: 'assessment', elements: orderedElements }],
  };
}

router.get('/assessment/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        publicHash: param(req.params.hash),
        orgId: req.orgId,
        status: 'active',
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimitMinutes: true,
        surveyJson: true,
        allowStudentReview: true,
      },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    const questionCount = getGradableElements(assessment.surveyJson as SurveyJson).length;

    return res.json({
      success: true,
      data: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        timeLimitMinutes: assessment.timeLimitMinutes,
        questionCount,
        allowStudentReview: assessment.allowStudentReview,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/assessment/:hash/start',
  validate(startAssessmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const firstName = req.body.firstName.trim();
      const lastName = req.body.lastName.trim();
      const studentEmail = req.body.studentEmail.toLowerCase();
      const studentName = `${firstName} ${lastName}`;

      const assessment = await prisma.assessment.findFirst({
        where: {
          publicHash: param(req.params.hash),
          orgId: req.orgId,
          status: 'active',
        },
        select: {
          id: true,
          surveyJson: true,
          randomizeQuestions: true,
          randomizeChoices: true,
          timeLimitMinutes: true,
        },
      });

      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }

      const existingIncompleteResponse = await prisma.assessmentResponse.findFirst({
        where: {
          assessmentId: assessment.id,
          studentEmail,
          completedAt: null,
        },
        select: {
          id: true,
          questionOrder: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      if (existingIncompleteResponse) {
        const resumedSurveyJson = buildResumedSurveyJson(
          assessment.surveyJson as SurveyJson,
          existingIncompleteResponse.questionOrder,
        );
        const sanitizedSurveyJson = stripSensitiveData(resumedSurveyJson);

        return res.json({
          success: true,
          data: {
            responseId: existingIncompleteResponse.id,
            surveyJson: applyTimerConfig(sanitizedSurveyJson, assessment.timeLimitMinutes),
            questionOrder: Array.isArray(existingIncompleteResponse.questionOrder)
              ? existingIncompleteResponse.questionOrder
              : [],
          },
        });
      }

      const existingResponseCount = await prisma.assessmentResponse.count({
        where: {
          assessmentId: assessment.id,
          studentEmail,
        },
      });

      const student = await prisma.student.upsert({
        where: { orgId_email: { orgId: req.orgId, email: studentEmail } },
        create: {
          orgId: req.orgId,
          email: studentEmail,
          firstName,
          lastName,
          password: null,
        },
        update: {},
      });

      const randomized = randomizeAssessment(assessment.surveyJson as SurveyJson, {
        randomizeQuestions: assessment.randomizeQuestions,
        randomizeChoices: assessment.randomizeChoices,
      });

      const response = await prisma.assessmentResponse.create({
        data: {
          assessmentId: assessment.id,
          studentId: student.id,
          studentEmail,
          studentName,
          attempt: existingResponseCount + 1,
          responseData: {},
          questionOrder: randomized.questionOrder,
          startedAt: new Date(),
        },
        select: {
          id: true,
          questionOrder: true,
        },
      });

      const sanitizedSurveyJson = stripSensitiveData(cloneJson(randomized.surveyJson));

      return res.json({
        success: true,
        data: {
          responseId: response.id,
          surveyJson: applyTimerConfig(sanitizedSurveyJson, assessment.timeLimitMinutes),
          questionOrder: randomized.questionOrder,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/assessment/:hash/submit',
  validate(submitAssessmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { responseId, responseData, timeTaken } = req.body;

      const response = await prisma.assessmentResponse.findFirst({
        where: {
          id: responseId,
          assessment: {
            publicHash: param(req.params.hash),
            orgId: req.orgId,
          },
        },
        include: { assessment: true },
      });

      if (!response) {
        throw new NotFoundError('Assessment response not found');
      }

      if (response.completedAt) {
        throw new ValidationError('Assessment has already been submitted');
      }

      const score = scoreSurveyResponse(
        response.assessment.surveyJson as SurveyJson,
        responseData,
        response.assessment.passingScore || 70,
      );

      await prisma.assessmentResponse.update({
        where: { id: response.id },
        data: {
          responseData,
          completedAt: new Date(),
          timeTaken,
          totalQuestions: score.totalQuestions,
          totalCorrect: score.totalCorrect,
          scorePercentage: score.scorePercentage,
          passed: score.passed,
        },
      });

      const resultData = response.assessment.showScoreFeedback
        ? {
            responseId: response.id,
            totalQuestions: score.totalQuestions,
            totalCorrect: score.totalCorrect,
            scorePercentage: score.scorePercentage,
            passed: score.passed,
          }
        : { responseId: response.id };

      return res.json({
        success: true,
        data: resultData,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
