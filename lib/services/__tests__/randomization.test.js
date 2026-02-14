import { describe, it, expect } from 'vitest';
import { randomizeAssessment } from '../randomization.js';

const makeSurvey = (elements) => ({
  pages: [{ name: 'page1', elements }],
});

describe('randomizeAssessment', () => {
  const survey = makeSurvey([
    { name: 'q1', correctAnswer: 'A', choices: ['A', 'B', 'C', 'D'] },
    { name: 'q2', correctAnswer: 'B', choices: ['A', 'B', 'C', 'D'] },
    { name: 'q3', correctAnswer: 'C', choices: ['A', 'B', 'C', 'D'] },
    { name: 'q4', correctAnswer: 'D', choices: ['A', 'B', 'C', 'D'] },
    { name: 'q5', correctAnswer: 'A', choices: ['A', 'B', 'C', 'D'] },
  ]);

  it('returns all questions', () => {
    const { surveyJson, questionOrder } = randomizeAssessment(survey);
    expect(questionOrder).toHaveLength(5);
    expect(surveyJson.pages[0].elements).toHaveLength(5);
  });

  it('preserves question names in questionOrder', () => {
    const { questionOrder } = randomizeAssessment(survey);
    const originalNames = new Set(['q1', 'q2', 'q3', 'q4', 'q5']);
    for (const name of questionOrder) {
      expect(originalNames.has(name)).toBe(true);
    }
  });

  it('collapses multiple pages into a single page', () => {
    const multiPage = {
      pages: [
        { name: 'p1', elements: [{ name: 'q1', correctAnswer: 'A', choices: ['A', 'B'] }] },
        { name: 'p2', elements: [{ name: 'q2', correctAnswer: 'B', choices: ['A', 'B'] }] },
      ],
    };
    const { surveyJson } = randomizeAssessment(multiPage);
    expect(surveyJson.pages).toHaveLength(1);
    expect(surveyJson.pages[0].elements).toHaveLength(2);
  });

  it('does not randomize questions when disabled', () => {
    const { questionOrder } = randomizeAssessment(survey, {
      randomizeQuestions: false,
      randomizeChoices: false,
    });
    expect(questionOrder).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  it('does not randomize choices when disabled', () => {
    const singleQ = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B', 'C', 'D'] },
    ]);
    const { surveyJson } = randomizeAssessment(singleQ, {
      randomizeQuestions: false,
      randomizeChoices: false,
    });
    expect(surveyJson.pages[0].elements[0].choices).toEqual(['A', 'B', 'C', 'D']);
  });

  it('preserves correctAnswer on each element', () => {
    const { surveyJson } = randomizeAssessment(survey);
    for (const el of surveyJson.pages[0].elements) {
      expect(el.correctAnswer).toBeDefined();
    }
  });

  it('only includes elements with correctAnswer', () => {
    const mixed = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B'] },
      { name: 'info', title: 'Read this text' },
      { name: 'q2', correctAnswer: 'B', choices: ['A', 'B'] },
    ]);
    const { surveyJson, questionOrder } = randomizeAssessment(mixed);
    expect(questionOrder).toHaveLength(2);
    expect(surveyJson.pages[0].elements).toHaveLength(2);
  });

  it('does not mutate the original survey', () => {
    const original = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B', 'C'] },
    ]);
    const originalJson = JSON.stringify(original);
    randomizeAssessment(original);
    expect(JSON.stringify(original)).toBe(originalJson);
  });

  it('handles empty survey', () => {
    const { surveyJson, questionOrder } = randomizeAssessment({ pages: [] });
    expect(questionOrder).toHaveLength(0);
    expect(surveyJson.pages[0].elements).toHaveLength(0);
  });
});
