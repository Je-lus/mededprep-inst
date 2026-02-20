/**
 * CSV Import Service
 * Parses CSV files and converts to SurveyJS JSON format
 *
 * Expected CSV columns:
 * Chapter, Question Code, Question, Question Choice, Answer 1-6, Correct Answer,
 * Difficulty Level, Category, Sub Topics, Explanation, Page Number
 */
import { parse } from 'csv-parse/sync';
import { ValidationError } from '../errors.js';
import type { SurveyJson, SurveyElement } from '../../types/survey.js';

interface CsvRow {
  [key: string]: string | undefined;
}

export interface CsvImportResult {
  surveyJson: SurveyJson;
  questionCount: number;
  warnings: string[];
}

const REQUIRED_COLUMNS = ['Question Code', 'Question', 'Answer 1', 'Correct Answer'];

export function parseCsvToSurveyJson(csvContent: string): CsvImportResult {
  const records = parse(csvContent, {
    columns: true,
    delimiter: '\t',
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[];

  if (records.length === 0) {
    throw new ValidationError('CSV file is empty or contains no data rows');
  }

  const headers = Object.keys(records[0]);
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new ValidationError(`CSV is missing required columns: ${missing.join(', ')}`);
  }

  const elements: SurveyElement[] = [];
  const warnings: string[] = [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
    const row = records[rowIndex];
    const rowNum = rowIndex + 2; // +2 because row 1 is header, data starts at row 2
    const questionCode = row['Question Code']?.trim();
    const questionText = row['Question']?.trim();
    const questionChoice = row['Question Choice']?.trim() || 'Single';

    if (!questionCode || !questionText) {
      warnings.push(`Row ${rowNum}: skipped — missing Question Code or Question text`);
      continue;
    }

    const choices: { value: string; text: string }[] = [];
    for (let i = 1; i <= 6; i++) {
      const answerText = row[`Answer ${i}`]?.trim();
      if (answerText) {
        choices.push({ value: letters[i - 1], text: answerText });
      }
    }

    const correctAnswer = row['Correct Answer']?.trim();
    const difficulty = parseInt(row['Difficulty Level'] ?? '') || null;

    // Validate correctAnswer against available choices
    const choiceValues = choices.map((c) => c.value);
    if (correctAnswer) {
      if (questionChoice.toLowerCase() === 'multiple') {
        const answerValues = correctAnswer.split(',').map((a) => a.trim());
        const invalid = answerValues.filter((v) => !choiceValues.includes(v));
        if (invalid.length > 0) {
          warnings.push(
            `Row ${rowNum} (${questionCode}): correctAnswer '${invalid.join(', ')}' does not match any choice`,
          );
        }
      } else {
        if (!choiceValues.includes(correctAnswer)) {
          warnings.push(
            `Row ${rowNum} (${questionCode}): correctAnswer '${correctAnswer}' does not match any choice`,
          );
        }
      }
    }

    const element: SurveyElement = {
      type: questionChoice.toLowerCase() === 'multiple' ? 'checkbox' : 'radiogroup',
      name: questionCode,
      title: questionText,
      isRequired: true,
      choices,
      correctAnswer:
        questionChoice.toLowerCase() === 'multiple'
          ? correctAnswer?.split(',').map((a) => a.trim())
          : correctAnswer,
      metadata: {
        chapter: row['Chapter']?.trim() || null,
        questionCode,
        difficulty,
        category: row['Category']?.trim() || null,
        subTopics: row['Sub Topics']?.trim() || null,
        explanation: row['Explanation']?.trim() || null,
        pageNumber: row['Page Number']?.trim() || null,
      },
    };

    elements.push(element);
  }

  const chapterMap = new Map<string, SurveyElement[]>();
  for (const el of elements) {
    const chapter = el.metadata?.chapter || 'Questions';
    if (!chapterMap.has(chapter)) chapterMap.set(chapter, []);
    chapterMap.get(chapter)!.push(el);
  }

  const pages = [];
  for (const [chapter, chapterElements] of chapterMap) {
    pages.push({
      name: chapter.replace(/\s+/g, '_').toLowerCase(),
      title: chapter,
      elements: chapterElements,
    });
  }

  return { surveyJson: { pages }, questionCount: elements.length, warnings };
}
