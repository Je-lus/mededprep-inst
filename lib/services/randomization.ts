/**
 * Assessment Randomization Service
 * Shuffles questions and answer choices per student
 */
import crypto from 'crypto';
import type { SurveyJson, SurveyElement } from '../../types/survey.js';

interface RandomizationOptions {
  randomizeQuestions?: boolean;
  randomizeChoices?: boolean;
}

export interface RandomizationResult {
  surveyJson: SurveyJson;
  questionOrder: string[];
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Randomize an assessment's questions and choices
 */
export function randomizeAssessment(
  surveyJson: SurveyJson,
  options: RandomizationOptions = {},
): RandomizationResult {
  const { randomizeQuestions = true, randomizeChoices = true } = options;

  const allElements: SurveyElement[] = [];
  for (const page of surveyJson.pages || []) {
    for (const element of page.elements || []) {
      if ('correctAnswer' in element) {
        allElements.push({ ...element });
      }
    }
  }

  const orderedElements = randomizeQuestions ? shuffle(allElements) : [...allElements];
  const questionOrder = orderedElements.map((el) => el.name);

  const finalElements = orderedElements.map((el) => {
    if (randomizeChoices && Array.isArray(el.choices)) {
      return { ...el, choices: shuffle(el.choices) };
    }
    return el;
  });

  const randomizedJson: SurveyJson = {
    ...surveyJson,
    pages: [{ name: 'assessment', elements: finalElements }],
  };

  return { surveyJson: randomizedJson, questionOrder };
}
