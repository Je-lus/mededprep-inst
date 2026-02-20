/**
 * Student Stats Routes — Peer context / class performance data
 *
 * All data is anonymized: no student names or individual scores are exposed.
 * Requires a minimum of 3 total responses before returning peer data
 * to protect individual student privacy.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireStudentAuth } from '../lib/auth.js';
import { param } from '../lib/route-utils.js';
import { z, formatZodErrors } from '../lib/validate.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

const router = Router();

const MIN_RESPONSES_FOR_PEER_DATA = 3;

/**
 * Compute the median of a sorted array of numbers.
 */
function computeMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Build score distribution buckets in 10% increments.
 */
function buildScoreDistribution(scores: number[]): { range: string; count: number }[] {
  const buckets = [
    { range: '0-10', min: 0, max: 10, count: 0 },
    { range: '11-20', min: 11, max: 20, count: 0 },
    { range: '21-30', min: 21, max: 30, count: 0 },
    { range: '31-40', min: 31, max: 40, count: 0 },
    { range: '41-50', min: 41, max: 50, count: 0 },
    { range: '51-60', min: 51, max: 60, count: 0 },
    { range: '61-70', min: 61, max: 70, count: 0 },
    { range: '71-80', min: 71, max: 80, count: 0 },
    { range: '81-90', min: 81, max: 90, count: 0 },
    { range: '91-100', min: 91, max: 100, count: 0 },
  ];

  for (const score of scores) {
    for (const bucket of buckets) {
      if (score >= bucket.min && score <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets.map(({ range, count }) => ({ range, count }));
}

/**
 * GET /api/student/assessments/:assessmentId/peer-stats
 *
 * Returns anonymized class performance data for a specific assessment.
 */
router.get(
  '/assessments/:assessmentId/peer-stats',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessmentId = param(req.params.assessmentId);

      // Verify the assessment exists within this org
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          orgId: req.orgId,
        },
        select: { id: true },
      });

      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }

      // Fetch all completed responses for this assessment within the org
      const responses = await prisma.assessmentResponse.findMany({
        where: {
          assessmentId,
          completedAt: { not: null },
          scorePercentage: { not: null },
          assessment: { orgId: req.orgId },
        },
        select: {
          scorePercentage: true,
          studentId: true,
        },
      });

      const totalResponses = responses.length;

      if (totalResponses < MIN_RESPONSES_FOR_PEER_DATA) {
        return res.json({
          success: true,
          data: {
            classAverage: null,
            classMedian: null,
            totalResponses,
            percentile: null,
            scoreDistribution: null,
            insufficientData: true,
          },
        });
      }

      const scores = responses.map((r) => Number(r.scorePercentage));
      const sortedScores = [...scores].sort((a, b) => a - b);

      const classAverage = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const classMedian = computeMedian(sortedScores);

      // Find the requesting student's best score for this assessment
      const studentResponses = responses.filter((r) => r.studentId === req.student!.id);
      let percentile: number | null = null;

      if (studentResponses.length > 0) {
        const studentBestScore = Math.max(
          ...studentResponses.map((r) => Number(r.scorePercentage)),
        );
        // Percentile: percentage of all scores that are strictly below the student's best score
        const belowCount = sortedScores.filter((s) => s < studentBestScore).length;
        percentile = Math.round((belowCount / totalResponses) * 100);
      }

      const scoreDistribution = buildScoreDistribution(scores);

      return res.json({
        success: true,
        data: {
          classAverage: Math.round(classAverage * 100) / 100,
          classMedian: Math.round(classMedian * 100) / 100,
          totalResponses,
          percentile,
          scoreDistribution,
          insufficientData: false,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/student/responses/:responseId/peer-stats
 *
 * Convenience endpoint: looks up the assessmentId from a response ID,
 * then returns the same peer stats as the assessment-based endpoint.
 * Useful on the review page where we only have the responseId.
 */
router.get(
  '/responses/:responseId/peer-stats',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const responseId = param(req.params.responseId);

      // Look up the response to get its assessmentId
      const response = await prisma.assessmentResponse.findFirst({
        where: {
          id: responseId,
          studentId: req.student!.id,
          assessment: { orgId: req.orgId },
        },
        select: { assessmentId: true },
      });

      if (!response) {
        throw new NotFoundError('Response not found');
      }

      const assessmentId = response.assessmentId;

      // Fetch all completed responses for this assessment within the org
      const allResponses = await prisma.assessmentResponse.findMany({
        where: {
          assessmentId,
          completedAt: { not: null },
          scorePercentage: { not: null },
          assessment: { orgId: req.orgId },
        },
        select: {
          scorePercentage: true,
          studentId: true,
        },
      });

      const totalResponses = allResponses.length;

      if (totalResponses < MIN_RESPONSES_FOR_PEER_DATA) {
        return res.json({
          success: true,
          data: {
            classAverage: null,
            classMedian: null,
            totalResponses,
            percentile: null,
            scoreDistribution: null,
            insufficientData: true,
          },
        });
      }

      const scores = allResponses.map((r) => Number(r.scorePercentage));
      const sortedScores = [...scores].sort((a, b) => a - b);

      const classAverage = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const classMedian = computeMedian(sortedScores);

      // Find the requesting student's best score for this assessment
      const studentResponses = allResponses.filter((r) => r.studentId === req.student!.id);
      let percentile: number | null = null;

      if (studentResponses.length > 0) {
        const studentBestScore = Math.max(
          ...studentResponses.map((r) => Number(r.scorePercentage)),
        );
        const belowCount = sortedScores.filter((s) => s < studentBestScore).length;
        percentile = Math.round((belowCount / totalResponses) * 100);
      }

      const scoreDistribution = buildScoreDistribution(scores);

      return res.json({
        success: true,
        data: {
          classAverage: Math.round(classAverage * 100) / 100,
          classMedian: Math.round(classMedian * 100) / 100,
          totalResponses,
          percentile,
          scoreDistribution,
          insufficientData: false,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/student/assessments/class-averages?ids=id1,id2,id3
 *
 * Batch endpoint: returns class average scores for multiple assessments.
 * Efficient for dashboard display without fetching full peer stats for each.
 */
const classAveragesSchema = z.object({
  ids: z.string().min(1),
});

router.get(
  '/assessments/class-averages',
  requireStudentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = classAveragesSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', formatZodErrors(parsed.error));
      }

      const ids = parsed.data.ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        return res.json({ success: true, data: {} });
      }

      // Cap at 50 assessment IDs per request to prevent abuse
      const limitedIds = ids.slice(0, 50);

      // Verify these assessments belong to the org
      const validAssessments = await prisma.assessment.findMany({
        where: {
          id: { in: limitedIds },
          orgId: req.orgId,
        },
        select: { id: true },
      });

      const validIds = validAssessments.map((a) => a.id);

      if (validIds.length === 0) {
        return res.json({ success: true, data: {} });
      }

      // Group responses by assessment and compute averages
      const responses = await prisma.assessmentResponse.findMany({
        where: {
          assessmentId: { in: validIds },
          completedAt: { not: null },
          scorePercentage: { not: null },
          assessment: { orgId: req.orgId },
        },
        select: {
          assessmentId: true,
          scorePercentage: true,
        },
      });

      // Group by assessmentId
      const grouped = new Map<string, number[]>();
      for (const r of responses) {
        const scores = grouped.get(r.assessmentId) ?? [];
        scores.push(Number(r.scorePercentage));
        grouped.set(r.assessmentId, scores);
      }

      // Build result map
      const result: Record<string, { classAverage: number; totalResponses: number } | null> = {};
      for (const id of validIds) {
        const scores = grouped.get(id);
        if (!scores || scores.length < MIN_RESPONSES_FOR_PEER_DATA) {
          result[id] = null;
        } else {
          const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          result[id] = {
            classAverage: Math.round(avg * 100) / 100,
            totalResponses: scores.length,
          };
        }
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
