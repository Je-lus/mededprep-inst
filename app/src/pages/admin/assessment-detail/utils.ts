import type { AssessmentDetail, SurveyElement } from '@/types/api';

export function getQuestionCount(surveyJson: AssessmentDetail['surveyJson']) {
  if (!surveyJson?.pages) return 0;
  return surveyJson.pages.reduce((total, page) => {
    if (!Array.isArray(page?.elements)) return total;
    return total + page.elements.filter((element: SurveyElement | undefined) => !!element?.name).length;
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
