import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { z, validate } from '../lib/validate.js';
import { parseCsvToSurveyJson } from '../lib/services/csv-import.js';
import type { Prisma } from '@prisma/client';
import type { SurveyElement } from '../types/survey.js';

/** Express route params are always strings; cast from string | string[] */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const router = Router();

const createBankSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().optional(),
});

const updateBankSchema = createBankSchema.partial();

const createItemSchema = z.object({
  questionData: z.record(z.unknown()),
});

const updateItemSchema = createItemSchema;

const importCsvSchema = z.object({
  csvContent: z.string().min(1),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

async function findBankOrThrow(id: string, orgId: string, include?: Record<string, unknown>) {
  const bank = await prisma.questionBank.findFirst({
    where: { id, orgId },
    include,
  });

  if (!bank) throw new NotFoundError('Question bank not found');
  return bank;
}

async function findItemOrThrow(bankId: string, itemId: string, orgId: string) {
  const item = await prisma.questionBankItem.findFirst({
    where: {
      id: itemId,
      bankId,
      bank: { orgId },
    },
  });

  if (!item) throw new NotFoundError('Question not found');
  return item;
}

function formatZodErrors(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_root';
    if (!details[field]) {
      details[field] = issue.message;
    }
  }
  return details;
}

// GET / - List banks for org
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banks = await prisma.questionBank.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });

    res.json({ success: true, data: banks });
  } catch (error) {
    next(error);
  }
});

// POST / - Create bank
router.post(
  '/',
  validate(createBankSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, subject } = req.body;

      const bank = await prisma.questionBank.create({
        data: {
          orgId: req.orgId,
          createdById: req.user!.id,
          title,
          description,
          subject,
        },
      });

      res.json({ success: true, data: bank });
    } catch (error) {
      next(error);
    }
  },
);

// GET /:id - Get bank with items (paginated)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bank = await findBankOrThrow(param(req.params.id), req.orgId);
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      prisma.questionBankItem.findMany({
        where: { bankId: bank.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.questionBankItem.count({ where: { bankId: bank.id } }),
    ]);

    res.json({
      success: true,
      data: {
        ...bank,
        items,
        totalItems,
        page,
        limit,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('Invalid query parameters', formatZodErrors(error)));
    }
    next(error);
  }
});

// PUT /:id - Update bank metadata
router.put(
  '/:id',
  validate(updateBankSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await findBankOrThrow(param(req.params.id), req.orgId);

      const updated = await prisma.questionBank.update({
        where: { id: bank.id },
        data: req.body,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /:id - Delete bank (cascades to items)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bank = await findBankOrThrow(param(req.params.id), req.orgId);

    await prisma.questionBank.delete({ where: { id: bank.id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

// POST /:id/items - Add question to bank
router.post(
  '/:id/items',
  validate(createItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await findBankOrThrow(param(req.params.id), req.orgId);
      const { questionData } = req.body;

      const item = await prisma.questionBankItem.create({
        data: {
          bankId: bank.id,
          questionData: questionData as unknown as Prisma.InputJsonValue,
        },
      });

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /:id/items/:itemId - Update question
router.put(
  '/:id/items/:itemId',
  validate(updateItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankId = param(req.params.id);
      const itemId = param(req.params.itemId);
      await findItemOrThrow(bankId, itemId, req.orgId);

      const { questionData } = req.body;

      const updated = await prisma.questionBankItem.update({
        where: { id: itemId },
        data: {
          questionData: questionData as unknown as Prisma.InputJsonValue,
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /:id/items/:itemId - Remove question
router.delete('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bankId = param(req.params.id);
    const itemId = param(req.params.itemId);
    await findItemOrThrow(bankId, itemId, req.orgId);

    await prisma.questionBankItem.delete({ where: { id: itemId } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

// POST /:id/import-csv - Import CSV directly into bank
router.post(
  '/:id/import-csv',
  validate(importCsvSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await findBankOrThrow(param(req.params.id), req.orgId);

      const { surveyJson, questionCount } = parseCsvToSurveyJson(req.body.csvContent);

      // Extract individual elements from all pages
      const elements: SurveyElement[] = [];
      for (const page of surveyJson.pages || []) {
        if (Array.isArray(page.elements)) {
          elements.push(...(page.elements as SurveyElement[]));
        }
      }

      // Create QuestionBankItem records for each element
      await prisma.questionBankItem.createMany({
        data: elements.map((element) => ({
          bankId: bank.id,
          questionData: element as unknown as Prisma.InputJsonValue,
        })),
      });

      res.json({ success: true, data: { questionCount } });
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /:id/items/:itemId/increment-usage - Increment usage count
router.patch('/:id/items/:itemId/increment-usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bankId = param(req.params.id);
    const itemId = param(req.params.itemId);
    await findItemOrThrow(bankId, itemId, req.orgId);

    await prisma.questionBankItem.update({
      where: { id: itemId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    res.json({ success: true, data: { incremented: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
