import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { z, validate } from '../lib/validate.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { scoreSurveyResponse, stripSensitiveData } from '../lib/services/quiz-scoring.js';
import { randomizeAssessment } from '../lib/services/randomization.js';

const router = Router();

const startAssessmentSchema = z.object({
  studentName: z.string().trim().min(1),
  studentEmail: z.string().email(),
});

const submitAssessmentSchema = z.object({
  responseId: z.string(),
  responseData: z.record(z.string(), z.unknown()),
  timeTaken: z.number().int().optional(),
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getGradableElements(surveyJson) {
  const elements = [];

  for (const page of surveyJson?.pages || []) {
    for (const element of page?.elements || []) {
      if (element && typeof element === 'object' && 'correctAnswer' in element) {
        elements.push(element);
      }
    }
  }

  return elements;
}

function parseStudentName(studentName) {
  const parts = studentName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Student', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function applyTimerConfig(surveyJson, timeLimitMinutes) {
  if (timeLimitMinutes) {
    surveyJson.showTimer = true;
    surveyJson.timeLimit = timeLimitMinutes * 60;
  }
  return surveyJson;
}

function buildResumedSurveyJson(originalSurveyJson, questionOrder) {
  const baseJson = cloneJson(originalSurveyJson);
  const gradableElements = getGradableElements(baseJson);
  const elementByName = new Map();

  for (const element of gradableElements) {
    if (element?.name) {
      elementByName.set(element.name, element);
    }
  }

  const seen = new Set();
  const orderedElements = [];

  if (Array.isArray(questionOrder)) {
    for (const questionName of questionOrder) {
      const element = elementByName.get(questionName);
      if (!element) continue;
      orderedElements.push(element);
      seen.add(questionName);
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

router.get('/assessment/:hash', async (req, res, next) => {
  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        publicHash: req.params.hash,
        orgId: req.orgId,
        status: 'active',
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimitMinutes: true,
        surveyJson: true,
      },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    const questionCount = getGradableElements(assessment.surveyJson).length;

    return res.json({
      success: true,
      data: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        timeLimitMinutes: assessment.timeLimitMinutes,
        questionCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/assessment/:hash/start', validate(startAssessmentSchema), async (req, res, next) => {
  try {
    const studentName = req.body.studentName.trim();
    const studentEmail = req.body.studentEmail.toLowerCase();

    const assessment = await prisma.assessment.findFirst({
      where: {
        publicHash: req.params.hash,
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

    const existingResponse = await prisma.assessmentResponse.findFirst({
      where: {
        assessmentId: assessment.id,
        studentEmail,
      },
      select: {
        id: true,
        completedAt: true,
        questionOrder: true,
      },
    });

    if (existingResponse?.completedAt) {
      throw new ValidationError('You have already completed this assessment');
    }

    if (existingResponse) {
      const resumedSurveyJson = buildResumedSurveyJson(
        assessment.surveyJson,
        existingResponse.questionOrder,
      );
      const sanitizedSurveyJson = stripSensitiveData(resumedSurveyJson);

      return res.json({
        success: true,
        data: {
          responseId: existingResponse.id,
          surveyJson: applyTimerConfig(sanitizedSurveyJson, assessment.timeLimitMinutes),
          questionOrder: Array.isArray(existingResponse.questionOrder)
            ? existingResponse.questionOrder
            : [],
        },
      });
    }

    const { firstName, lastName } = parseStudentName(studentName);
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

    const randomized = randomizeAssessment(assessment.surveyJson, {
      randomizeQuestions: assessment.randomizeQuestions,
      randomizeChoices: assessment.randomizeChoices,
    });

    const response = await prisma.assessmentResponse.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        studentEmail,
        studentName,
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
});

router.post('/assessment/:hash/submit', validate(submitAssessmentSchema), async (req, res, next) => {
  try {
    const { responseId, responseData, timeTaken } = req.body;

    const response = await prisma.assessmentResponse.findFirst({
      where: {
        id: responseId,
        assessment: {
          publicHash: req.params.hash,
          orgId: req.orgId,
        },
      },
      include: {
        assessment: {
          select: {
            surveyJson: true,
            passingScore: true,
          },
        },
      },
    });

    if (!response) {
      throw new NotFoundError('Assessment response not found');
    }

    if (response.completedAt) {
      throw new ValidationError('Assessment has already been submitted');
    }

    const score = scoreSurveyResponse(
      response.assessment.surveyJson,
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

    return res.json({
      success: true,
      data: {
        responseId: response.id,
        totalQuestions: score.totalQuestions,
        totalCorrect: score.totalCorrect,
        scorePercentage: score.scorePercentage,
        passed: score.passed,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
