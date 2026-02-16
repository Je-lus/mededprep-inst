/**
 * Quiz Scoring Service
 * Scores survey responses against original survey JSON
 */

import type { SurveyJson, SurveyElement, SurveyChoice } from '../../types/survey.js';

export interface ScoreResult {
  totalQuestions: number;
  totalCorrect: number;
  scorePercentage: number;
  passed: boolean;
}

/**
 * Score a survey response against the original survey JSON
 */
export function scoreSurveyResponse(
  originalSurveyJson: SurveyJson,
  responseData: Record<string, unknown>,
  passingScore = 70,
): ScoreResult {
  let totalCorrect = 0;
  let totalQuestions = 0;

  const questionMap: Record<string, { correctAnswer?: unknown }> = {};
  for (const page of originalSurveyJson.pages || []) {
    for (const element of page.elements || []) {
      if (element.name) questionMap[element.name] = element;
    }
  }

  for (const [questionName, element] of Object.entries(questionMap)) {
    if (!('correctAnswer' in element)) continue;
    totalQuestions++;

    const studentAnswer = responseData[questionName];
    const correctAnswer = element.correctAnswer;

    const normalizedStudent = Array.isArray(studentAnswer)
      ? JSON.stringify([...studentAnswer].sort())
      : String(studentAnswer ?? '');
    const normalizedCorrect = Array.isArray(correctAnswer)
      ? JSON.stringify([...(correctAnswer as unknown[])].sort())
      : String(correctAnswer ?? '');

    if (normalizedStudent === normalizedCorrect) totalCorrect++;
  }

  const scorePercentage =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 10000) / 100 : 0;

  return {
    totalQuestions,
    totalCorrect,
    scorePercentage,
    passed: totalQuestions > 0 ? scorePercentage >= passingScore : true,
  };
}

/**
 * Recursively remove all correctAnswer and metadata properties from survey JSON
 */
export function stripSensitiveData<T>(obj: T): T {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) stripSensitiveData(item);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    delete record.correctAnswer;
    delete record.metadata;
    for (const value of Object.values(record)) {
      if (typeof value === 'object' && value !== null) stripSensitiveData(value);
    }
  }
  return obj;
}

/**
 * Normalize answer for comparison (handles arrays and strings)
 */
export function normalizeAnswer(answer: unknown): string {
  if (Array.isArray(answer)) {
    return JSON.stringify([...answer].sort());
  }
  return String(answer ?? '');
}

/**
 * Map a SurveyJS choice to a consistent object format
 */
export function mapChoice(choice: SurveyChoice | string): { value: string; text: string } {
  if (typeof choice === 'object' && choice !== null) {
    return { value: choice.value ?? choice.text, text: choice.text ?? choice.value };
  }
  return { value: choice, text: String(choice ?? '') };
}

/**
 * Review question interface for student and admin review
 */
export interface ReviewQuestion {
  questionName: string;
  questionTitle: string;
  choices: { value: string; text: string }[];
  studentAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean;
  explanation: string | null;
  pageNumber: string | null;
}

/**
 * Build a question-by-question breakdown for review
 */
export function buildReviewQuestions(
  surveyJson: SurveyJson,
  responseData: Record<string, unknown>,
): ReviewQuestion[] {
  const questions: ReviewQuestion[] = [];

  for (const page of surveyJson?.pages || []) {
    for (const element of (page?.elements || []) as SurveyElement[]) {
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
