import { describe, it, expect } from 'vitest';
import { parseCsvToSurveyJson } from '../csv-import.js';

function makeCsv(rows) {
  const headers =
    'Chapter\tQuestion Code\tQuestion\tQuestion Choice\tAnswer 1\tAnswer 2\tAnswer 3\tAnswer 4\tCorrect Answer\tDifficulty Level\tCategory\tSub Topics\tExplanation\tPage Number';
  const lines = rows.map((r) => r.join('\t'));
  return [headers, ...lines].join('\n');
}

describe('parseCsvToSurveyJson', () => {
  it('parses a basic single-choice question', () => {
    const csv = makeCsv([
      ['Ch1', 'Q001', 'What is 1+1?', 'Single', '1', '2', '3', '4', 'B', '1', 'Math', 'Add', 'Basic addition', '10'],
    ]);
    const { surveyJson, questionCount } = parseCsvToSurveyJson(csv);

    expect(questionCount).toBe(1);
    expect(surveyJson.pages).toHaveLength(1);

    const el = surveyJson.pages[0].elements[0];
    expect(el.type).toBe('radiogroup');
    expect(el.name).toBe('Q001');
    expect(el.title).toBe('What is 1+1?');
    expect(el.correctAnswer).toBe('B');
    expect(el.choices).toHaveLength(4);
    expect(el.isRequired).toBe(true);
  });

  it('parses multiple-choice questions as checkbox', () => {
    const csv = makeCsv([
      ['Ch1', 'Q001', 'Select all even', 'Multiple', '1', '2', '3', '4', 'B,D', '2', '', '', '', ''],
    ]);
    const { surveyJson } = parseCsvToSurveyJson(csv);
    const el = surveyJson.pages[0].elements[0];

    expect(el.type).toBe('checkbox');
    expect(el.correctAnswer).toEqual(['B', 'D']);
  });

  it('groups questions by chapter into pages', () => {
    const csv = makeCsv([
      ['Airway', 'Q001', 'Question 1', 'Single', 'A', 'B', '', '', 'A', '', '', '', '', ''],
      ['Airway', 'Q002', 'Question 2', 'Single', 'A', 'B', '', '', 'B', '', '', '', '', ''],
      ['Cardiac', 'Q003', 'Question 3', 'Single', 'A', 'B', '', '', 'A', '', '', '', '', ''],
    ]);
    const { surveyJson, questionCount } = parseCsvToSurveyJson(csv);

    expect(questionCount).toBe(3);
    expect(surveyJson.pages).toHaveLength(2);
    expect(surveyJson.pages[0].title).toBe('Airway');
    expect(surveyJson.pages[0].elements).toHaveLength(2);
    expect(surveyJson.pages[1].title).toBe('Cardiac');
    expect(surveyJson.pages[1].elements).toHaveLength(1);
  });

  it('stores metadata on each element', () => {
    const csv = makeCsv([
      ['Ch1', 'Q001', 'Question?', 'Single', 'A', 'B', '', '', 'A', '3', 'Trauma', 'Burns', 'Explanation text', '42'],
    ]);
    const { surveyJson } = parseCsvToSurveyJson(csv);
    const meta = surveyJson.pages[0].elements[0].metadata;

    expect(meta.chapter).toBe('Ch1');
    expect(meta.questionCode).toBe('Q001');
    expect(meta.difficulty).toBe(3);
    expect(meta.category).toBe('Trauma');
    expect(meta.subTopics).toBe('Burns');
    expect(meta.explanation).toBe('Explanation text');
    expect(meta.pageNumber).toBe('42');
  });

  it('skips rows without question code or text', () => {
    const csv = makeCsv([
      ['Ch1', '', 'No code', 'Single', 'A', 'B', '', '', 'A', '', '', '', '', ''],
      ['Ch1', 'Q001', '', 'Single', 'A', 'B', '', '', 'A', '', '', '', '', ''],
      ['Ch1', 'Q002', 'Valid', 'Single', 'A', 'B', '', '', 'A', '', '', '', '', ''],
    ]);
    const { questionCount } = parseCsvToSurveyJson(csv);
    expect(questionCount).toBe(1);
  });

  it('throws on empty CSV', () => {
    expect(() => parseCsvToSurveyJson('')).toThrow();
  });

  it('throws when required columns are missing', () => {
    const csv = 'Name\tAge\nJohn\t30';
    expect(() => parseCsvToSurveyJson(csv)).toThrow('missing required columns');
  });

  it('throws with specific missing column names', () => {
    const csv = 'Question Code\tQuestion\nQ1\tWhat?';
    expect(() => parseCsvToSurveyJson(csv)).toThrow('Answer 1');
    expect(() => parseCsvToSurveyJson(csv)).toThrow('Correct Answer');
  });

  it('only includes non-empty answers as choices', () => {
    const csv = makeCsv([
      ['Ch1', 'Q001', 'Question?', 'Single', 'Yes', 'No', '', '', 'A', '', '', '', '', ''],
    ]);
    const { surveyJson } = parseCsvToSurveyJson(csv);
    expect(surveyJson.pages[0].elements[0].choices).toHaveLength(2);
  });

  it('defaults question choice to Single when empty', () => {
    const csv = makeCsv([
      ['Ch1', 'Q001', 'Question?', '', 'A', 'B', '', '', 'A', '', '', '', '', ''],
    ]);
    const { surveyJson } = parseCsvToSurveyJson(csv);
    expect(surveyJson.pages[0].elements[0].type).toBe('radiogroup');
  });
});
