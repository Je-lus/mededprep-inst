import { describe, it, expect } from 'vitest';
import { computeItemAnalysis } from '../item-analysis.js';

const makeSurvey = (elements) => ({
  pages: [{ name: 'page1', elements }],
});

describe('computeItemAnalysis', () => {
  it('returns empty result for no responses', () => {
    const survey = makeSurvey([{ name: 'q1', correctAnswer: 'A', choices: ['A', 'B'] }]);
    const result = computeItemAnalysis(survey, []);
    expect(result.totalResponses).toBe(0);
    expect(result.totalQuestions).toBe(0);
    expect(result.questions).toEqual([]);
  });

  it('returns empty questions for survey with no scored elements', () => {
    const survey = makeSurvey([{ name: 'info', title: 'Read this' }]);
    const result = computeItemAnalysis(survey, [{ responseData: {} }]);
    expect(result.totalQuestions).toBe(0);
  });

  it('computes correct percentages for single question', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B', 'C'] },
    ]);
    const responses = [
      { responseData: { q1: 'A' } },
      { responseData: { q1: 'A' } },
      { responseData: { q1: 'B' } },
      { responseData: { q1: 'C' } },
    ];
    const result = computeItemAnalysis(survey, responses);

    expect(result.totalResponses).toBe(4);
    expect(result.totalQuestions).toBe(1);
    expect(result.questions[0].percentCorrect).toBe(50);
  });

  it('computes choice distribution', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B', 'C'] },
    ]);
    const responses = [
      { responseData: { q1: 'A' } },
      { responseData: { q1: 'B' } },
      { responseData: { q1: 'B' } },
      { responseData: { q1: 'C' } },
    ];
    const result = computeItemAnalysis(survey, responses);
    const dist = result.questions[0].choiceDistribution;

    expect(dist.find((d) => d.value === 'A').count).toBe(1);
    expect(dist.find((d) => d.value === 'B').count).toBe(2);
    expect(dist.find((d) => d.value === 'C').count).toBe(1);
  });

  it('computes point-biserial correlation', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B'] },
      { name: 'q2', correctAnswer: 'A', choices: ['A', 'B'] },
    ]);
    // Student 1: gets both right (high scorer gets q1 right → positive rpb)
    // Student 2: gets both wrong (low scorer gets q1 wrong → positive rpb)
    const responses = [
      { responseData: { q1: 'A', q2: 'A' } },
      { responseData: { q1: 'B', q2: 'B' } },
    ];
    const result = computeItemAnalysis(survey, responses);
    // rpb should be positive — high scorers get q1 right
    expect(result.questions[0].pointBiserial).toBeGreaterThan(0);
  });

  it('returns rpb of 0 when everyone gets the same answer', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B'] },
    ]);
    const responses = [
      { responseData: { q1: 'A' } },
      { responseData: { q1: 'A' } },
    ];
    const result = computeItemAnalysis(survey, responses);
    // p = 1.0, so rpb = 0 (no variance)
    expect(result.questions[0].pointBiserial).toBe(0);
  });

  it('computes average score', () => {
    const survey = makeSurvey([
      { name: 'q1', correctAnswer: 'A', choices: ['A', 'B'] },
      { name: 'q2', correctAnswer: 'B', choices: ['A', 'B'] },
    ]);
    const responses = [
      { responseData: { q1: 'A', q2: 'B' } }, // 100%
      { responseData: { q1: 'A', q2: 'A' } }, // 50%
    ];
    const result = computeItemAnalysis(survey, responses);
    expect(result.averageScore).toBe(75);
  });

  it('handles object-style choices', () => {
    const survey = makeSurvey([
      {
        name: 'q1',
        correctAnswer: 'A',
        choices: [
          { value: 'A', text: 'Answer A' },
          { value: 'B', text: 'Answer B' },
        ],
      },
    ]);
    const responses = [{ responseData: { q1: 'A' } }];
    const result = computeItemAnalysis(survey, responses);
    const dist = result.questions[0].choiceDistribution;
    expect(dist[0].text).toBe('Answer A');
    expect(dist[0].count).toBe(1);
  });

  it('includes question metadata', () => {
    const survey = makeSurvey([
      {
        name: 'q1',
        correctAnswer: 'A',
        choices: ['A'],
        metadata: { questionCode: 'Q001', chapter: 'Ch1', difficulty: 3 },
      },
    ]);
    const responses = [{ responseData: { q1: 'A' } }];
    const result = computeItemAnalysis(survey, responses);
    expect(result.questions[0].questionCode).toBe('Q001');
    expect(result.questions[0].chapter).toBe('Ch1');
    expect(result.questions[0].difficulty).toBe(3);
  });
});
