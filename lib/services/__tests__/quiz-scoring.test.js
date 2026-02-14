import { describe, it, expect } from 'vitest';
import { scoreSurveyResponse, stripSensitiveData } from '../quiz-scoring.js';

const makeSurvey = (elements) => ({
  pages: [{ name: 'page1', elements }],
});

describe('scoreSurveyResponse', () => {
  it('scores all correct answers', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A' },
      { name: 'q2', correctAnswer: 'B' },
    ]);
    const result = scoreSurveyResponse(survey, { q1: 'A', q2: 'B' });
    expect(result.totalQuestions).toBe(2);
    expect(result.totalCorrect).toBe(2);
    expect(result.scorePercentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('scores all wrong answers', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A' },
      { name: 'q2', correctAnswer: 'B' },
    ]);
    const result = scoreSurveyResponse(survey, { q1: 'C', q2: 'D' });
    expect(result.totalCorrect).toBe(0);
    expect(result.scorePercentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('scores partial answers correctly', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A' },
      { name: 'q2', correctAnswer: 'B' },
      { name: 'q3', correctAnswer: 'C' },
      { name: 'q4', correctAnswer: 'D' },
    ]);
    const result = scoreSurveyResponse(survey, { q1: 'A', q2: 'B', q3: 'X', q4: 'Y' });
    expect(result.totalCorrect).toBe(2);
    expect(result.scorePercentage).toBe(50);
  });

  it('handles array answers (multi-select) regardless of order', () => {
    const survey = makeSurvey([{ name: 'q1', correctAnswer: ['B', 'A', 'C'] }]);
    const result = scoreSurveyResponse(survey, { q1: ['C', 'A', 'B'] });
    expect(result.totalCorrect).toBe(1);
    expect(result.scorePercentage).toBe(100);
  });

  it('marks array answers wrong when items differ', () => {
    const survey = makeSurvey([{ name: 'q1', correctAnswer: ['A', 'B'] }]);
    const result = scoreSurveyResponse(survey, { q1: ['A', 'C'] });
    expect(result.totalCorrect).toBe(0);
  });

  it('handles missing student answer as empty string', () => {
    const survey = makeSurvey([{ name: 'q1', correctAnswer: 'A' }]);
    const result = scoreSurveyResponse(survey, {});
    expect(result.totalCorrect).toBe(0);
  });

  it('handles null student answer', () => {
    const survey = makeSurvey([{ name: 'q1', correctAnswer: 'A' }]);
    const result = scoreSurveyResponse(survey, { q1: null });
    expect(result.totalCorrect).toBe(0);
  });

  it('skips elements without correctAnswer', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A' },
      { name: 'info', title: 'Read this' },
    ]);
    const result = scoreSurveyResponse(survey, { q1: 'A' });
    expect(result.totalQuestions).toBe(1);
    expect(result.totalCorrect).toBe(1);
  });

  it('respects custom passing score', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A' },
      { name: 'q2', correctAnswer: 'B' },
    ]);
    // 50% score, passing threshold 40%
    const result = scoreSurveyResponse(survey, { q1: 'A', q2: 'X' }, 40);
    expect(result.passed).toBe(true);

    // 50% score, passing threshold 60%
    const result2 = scoreSurveyResponse(survey, { q1: 'A', q2: 'X' }, 60);
    expect(result2.passed).toBe(false);
  });

  it('returns zero for empty survey', () => {
    const result = scoreSurveyResponse({ pages: [] }, { q1: 'A' });
    expect(result.totalQuestions).toBe(0);
    expect(result.scorePercentage).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('handles multiple pages', () => {
    const survey = {
      pages: [
        { name: 'p1', elements: [{ name: 'q1', correctAnswer: 'A' }] },
        { name: 'p2', elements: [{ name: 'q2', correctAnswer: 'B' }] },
      ],
    };
    const result = scoreSurveyResponse(survey, { q1: 'A', q2: 'B' });
    expect(result.totalQuestions).toBe(2);
    expect(result.totalCorrect).toBe(2);
  });

  it('calculates precise percentages', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A' },
      { name: 'q2', correctAnswer: 'B' },
      { name: 'q3', correctAnswer: 'C' },
    ]);
    const result = scoreSurveyResponse(survey, { q1: 'A', q2: 'X', q3: 'X' });
    expect(result.scorePercentage).toBe(33.33);
  });
});

describe('stripSensitiveData', () => {
  it('removes correctAnswer from elements', () => {
    const obj = { pages: [{ elements: [{ name: 'q1', correctAnswer: 'A', title: 'Q1' }] }] };
    stripSensitiveData(obj);
    expect(obj.pages[0].elements[0].correctAnswer).toBeUndefined();
    expect(obj.pages[0].elements[0].title).toBe('Q1');
  });

  it('removes metadata from elements', () => {
    const obj = { pages: [{ elements: [{ name: 'q1', metadata: { explanation: 'Because...' } }] }] };
    stripSensitiveData(obj);
    expect(obj.pages[0].elements[0].metadata).toBeUndefined();
  });

  it('handles nested arrays', () => {
    const obj = [{ correctAnswer: 'A' }, [{ correctAnswer: 'B' }]];
    stripSensitiveData(obj);
    expect(obj[0].correctAnswer).toBeUndefined();
    expect(obj[1][0].correctAnswer).toBeUndefined();
  });

  it('handles null and primitives gracefully', () => {
    expect(stripSensitiveData(null)).toBeNull();
    expect(stripSensitiveData('string')).toBe('string');
    expect(stripSensitiveData(42)).toBe(42);
  });
});
