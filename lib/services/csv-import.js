/**
 * CSV Import Service
 * Parses CSV files and converts to SurveyJS JSON format
 *
 * Expected CSV columns:
 * Chapter, Question Code, Question, Question Choice, Answer 1-6, Correct Answer,
 * Difficulty Level, Category, Sub Topics, Explanation, Page Number
 */
import { parse } from 'csv-parse/sync';

const REQUIRED_COLUMNS = ['Question Code', 'Question', 'Answer 1', 'Correct Answer'];

export function parseCsvToSurveyJson(csvContent) {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    throw new Error('CSV file is empty or contains no data rows');
  }

  const headers = Object.keys(records[0]);
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
  }

  const elements = [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (const row of records) {
    const questionCode = row['Question Code']?.trim();
    const questionText = row['Question']?.trim();
    const questionChoice = row['Question Choice']?.trim() || 'Single';

    if (!questionCode || !questionText) continue;

    const choices = [];
    for (let i = 1; i <= 6; i++) {
      const answerText = row[`Answer ${i}`]?.trim();
      if (answerText) {
        choices.push({ value: letters[i - 1], text: answerText });
      }
    }

    const correctAnswer = row['Correct Answer']?.trim();
    const difficulty = parseInt(row['Difficulty Level']) || null;

    const element = {
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

  const chapterMap = new Map();
  for (const el of elements) {
    const chapter = el.metadata?.chapter || 'Questions';
    if (!chapterMap.has(chapter)) chapterMap.set(chapter, []);
    chapterMap.get(chapter).push(el);
  }

  const pages = [];
  for (const [chapter, chapterElements] of chapterMap) {
    pages.push({
      name: chapter.replace(/\s+/g, '_').toLowerCase(),
      title: chapter,
      elements: chapterElements,
    });
  }

  return { surveyJson: { pages }, questionCount: elements.length };
}
