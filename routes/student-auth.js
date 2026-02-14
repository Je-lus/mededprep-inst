import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import {
  generateStudentToken,
  setAuthCookie,
  clearAuthCookie,
  requireStudentAuth,
} from '../lib/auth.js';
import { z, validate } from '../lib/validate.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors.js';

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

function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return JSON.stringify([...answer].sort());
  }
  return String(answer ?? '');
}

function mapChoice(choice) {
  if (typeof choice === 'object' && choice !== null) {
    const value = 'value' in choice ? choice.value : choice.text;
    const text = 'text' in choice ? choice.text : value;
    return { value, text };
  }
  return { value: choice, text: String(choice ?? '') };
}

function buildReviewQuestions(surveyJson, responseData) {
  const questions = [];

  for (const page of surveyJson?.pages || []) {
    for (const element of page?.elements || []) {
      if (!(element && typeof element === 'object' && 'correctAnswer' in element)) {
        continue;
      }

      const studentAnswer = responseData?.[element.name];
      const correctAnswer = element.correctAnswer;

      questions.push({
        questionName: element.name,
        questionTitle: element.title || element.name,
        choices: (element.choices || []).map(mapChoice),
        studentAnswer,
        correctAnswer,
        isCorrect: normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer),
        explanation: element.metadata?.explanation ?? null,
        pageNumber: element.metadata?.pageNumber ?? null,
      });
    }
  }

  return questions;
}

function formatZodErrors(error) {
  const details = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_root';
    if (!details[field]) {
      details[field] = issue.message;
    }
  }
  return details;
}

router.post('/register', validate(registerSchema), async (req, res, next) => {
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
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
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
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res, 'student-token');
  return res.json({ success: true, data: { loggedOut: true } });
});

router.get('/me', requireStudentAuth, (req, res) => {
  return res.json({
    success: true,
    data: {
      student: req.student,
    },
  });
});

router.get('/assessments', requireStudentAuth, async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    const where = {
      studentId: req.student.id,
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

    return res.json({
      success: true,
      data: {
        responses: responses.map((response) => ({
          id: response.id,
          assessmentTitle: response.assessment.title,
          scorePercentage: response.scorePercentage,
          passed: response.passed,
          completedAt: response.completedAt,
          resultsReleased: response.assessment.resultsReleased,
        })),
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('Invalid query parameters', formatZodErrors(error)));
    }
    return next(error);
  }
});

router.get('/assessments/:id/review', requireStudentAuth, async (req, res, next) => {
  try {
    const response = await prisma.assessmentResponse.findFirst({
      where: {
        id: req.params.id,
        studentId: req.student.id,
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

    const questions = buildReviewQuestions(response.assessment.surveyJson, response.responseData);

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
});

export default router;
