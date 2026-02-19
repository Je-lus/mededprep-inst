import type { AssessmentDetail, AssessmentResponse, SurveyElement } from '@/types/api';

export function getQuestionCount(surveyJson: AssessmentDetail['surveyJson']) {
  if (!surveyJson?.pages) return 0;
  return surveyJson.pages.reduce((total, page) => {
    if (!Array.isArray(page?.elements)) return total;
    return (
      total + page.elements.filter((element: SurveyElement | undefined) => !!element?.name).length
    );
  }, 0);
}

export function normalizePercent(value: number) {
  return value <= 1 ? value * 100 : value;
}

export function getPublicUrl(publicHash: string) {
  return `${window.location.origin}/take/${publicHash}`;
}

export function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function formatTimeTaken(timeTaken?: number) {
  if (typeof timeTaken !== 'number') return '-';
  if (timeTaken < 60) return `${timeTaken}s`;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  return `${minutes}m ${seconds}s`;
}

export function pbsClass(value: number) {
  if (value > 0.3) return 'bg-emerald-50 text-emerald-700';
  if (value >= 0.2) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export interface ScoreBucket {
  range: string;
  count: number;
  passing: boolean;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function computeScoreDistribution(
  responses: AssessmentResponse[],
  passingScore: number,
): ScoreBucket[] {
  const buckets: ScoreBucket[] = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10 + (i === 0 ? 0 : 1)}-${(i + 1) * 10}%`,
    count: 0,
    passing: (i + 1) * 10 >= passingScore,
  }));

  for (const r of responses) {
    const raw = toNumber(r.scorePercentage);
    if (raw === null) continue;
    const score = normalizePercent(raw);
    const idx = score === 0 ? 0 : Math.min(Math.ceil(score / 10) - 1, 9);
    buckets[idx].count++;
  }

  return buckets;
}

export interface ResponseStats {
  median: number;
  min: number;
  max: number;
  passCount: number;
  failCount: number;
}

export function computeResponseStats(
  responses: AssessmentResponse[],
  passingScore: number,
): ResponseStats {
  const scores = responses
    .map((r) => {
      const raw = toNumber(r.scorePercentage);
      return raw !== null ? normalizePercent(raw) : null;
    })
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b);

  if (scores.length === 0) {
    return { median: 0, min: 0, max: 0, passCount: 0, failCount: 0 };
  }

  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];

  let passCount = 0;
  let failCount = 0;
  for (const score of scores) {
    if (score >= passingScore) passCount++;
    else failCount++;
  }

  return {
    median,
    min: scores[0],
    max: scores[scores.length - 1],
    passCount,
    failCount,
  };
}
