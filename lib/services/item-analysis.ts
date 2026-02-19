/**
 * Item Analysis Service
 * Computes per-question statistics including corrected point-biserial discrimination index (rpb)
 *
 * Uses the corrected point-biserial: the item being analyzed is removed from
 * each student's total score before computing the correlation. This avoids the
 * "part-whole" problem where the item inflates its own discrimination index.
 *
 * rpb = (M1 - M0) / S_corrected * sqrt(p * q)
 * M1 = mean corrected total of students who got the item RIGHT
 * M0 = mean corrected total of students who got the item WRONG
 * S_corrected = SD of all corrected totals (total minus this item's score)
 * p  = proportion correct, q = 1 - p
 *
 * Interpretation: >0.3 good, 0.2-0.3 acceptable, <0.2 weak
 */

import type { SurveyJson, SurveyElement } from '../../types/survey.js';

export interface ChoiceDistribution {
  value: string;
  text: string;
  count: number;
  percent: number;
}

export interface QuestionAnalysis {
  questionName: string;
  questionTitle: string;
  questionCode: string;
  chapter: string | null;
  difficulty: number | null;
  totalResponses: number;
  correctAnswer: string;
  percentCorrect: number;
  choiceDistribution: ChoiceDistribution[];
  pointBiserial: number;
}

export interface ItemAnalysisResult {
  totalResponses: number;
  totalQuestions: number;
  averageScore: number;
  questions: QuestionAnalysis[];
}

interface ResponseInput {
  responseData: Record<string, unknown> | null;
}

function normalizeAnswer(val: unknown): string {
  if (Array.isArray(val)) return JSON.stringify([...val].sort());
  return String(val ?? '');
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const squaredDiffs = arr.map((x) => (x - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

export function computeItemAnalysis(
  originalSurveyJson: SurveyJson,
  responses: ResponseInput[],
): ItemAnalysisResult {
  if (!responses.length) {
    return { totalResponses: 0, totalQuestions: 0, averageScore: 0, questions: [] };
  }

  const questions: SurveyElement[] = [];
  for (const page of originalSurveyJson.pages || []) {
    for (const element of page.elements || []) {
      if ('correctAnswer' in element) questions.push(element);
    }
  }

  if (!questions.length) {
    return {
      totalResponses: responses.length,
      totalQuestions: 0,
      averageScore: 0,
      questions: [],
    };
  }

  const studentScores = responses.map((r) => {
    let correct = 0;
    for (const q of questions) {
      const answer = r.responseData?.[q.name];
      if (normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer)) correct++;
    }
    return { responseData: r.responseData || {}, totalCorrect: correct };
  });

  const totalScores = studentScores.map((s) => s.totalCorrect);

  const questionAnalyses: QuestionAnalysis[] = questions.map((q) => {
    const choices = q.choices || [];
    const choiceCounts: Record<string, number> = {};
    for (const c of choices) {
      const val = typeof c === 'object' ? c.value : c;
      choiceCounts[val] = 0;
    }

    let correctCount = 0;
    const scoresCorrect: number[] = [];
    const scoresIncorrect: number[] = [];
    const correctedTotals: number[] = [];

    for (const student of studentScores) {
      const answer = student.responseData[q.name];
      const answerStr = typeof answer === 'string' ? answer : String(answer ?? '');
      if (choiceCounts[answerStr] !== undefined) choiceCounts[answerStr]++;

      const isCorrect = normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer);
      const correctedTotal = student.totalCorrect - (isCorrect ? 1 : 0);
      correctedTotals.push(correctedTotal);

      if (isCorrect) {
        correctCount++;
        scoresCorrect.push(correctedTotal);
      } else {
        scoresIncorrect.push(correctedTotal);
      }
    }

    const p = responses.length > 0 ? correctCount / responses.length : 0;
    const qVal = 1 - p;
    const M1 = mean(scoresCorrect);
    const M0 = mean(scoresIncorrect);
    const sdCorrected = standardDeviation(correctedTotals);

    let rpb = 0;
    if (sdCorrected > 0 && p > 0 && p < 1) {
      rpb = ((M1 - M0) / sdCorrected) * Math.sqrt(p * qVal);
    }

    return {
      questionName: q.name,
      questionTitle: q.title || q.name,
      questionCode: q.metadata?.questionCode || q.name,
      chapter: q.metadata?.chapter || null,
      difficulty: q.metadata?.difficulty || null,
      totalResponses: responses.length,
      correctAnswer: String(q.correctAnswer),
      percentCorrect:
        responses.length > 0 ? Math.round((correctCount / responses.length) * 10000) / 100 : 0,
      choiceDistribution: choices.map((c) => {
        const val = typeof c === 'object' ? c.value : c;
        const text = typeof c === 'object' ? c.text : c;
        return {
          value: val,
          text,
          count: choiceCounts[val] || 0,
          percent:
            responses.length > 0
              ? Math.round(((choiceCounts[val] || 0) / responses.length) * 10000) / 100
              : 0,
        };
      }),
      pointBiserial: Math.round(rpb * 1000) / 1000,
    };
  });

  const avgScore =
    responses.length > 0
      ? Math.round(
          (totalScores.reduce((a, b) => a + b, 0) / responses.length / questions.length) * 10000,
        ) / 100
      : 0;

  return {
    totalResponses: responses.length,
    totalQuestions: questions.length,
    averageScore: avgScore,
    questions: questionAnalyses,
  };
}
