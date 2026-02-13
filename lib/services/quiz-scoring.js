/**
 * Quiz Scoring Service
 * Scores survey responses against original survey JSON
 */

/**
 * Score a survey response against the original survey JSON
 */
export function scoreSurveyResponse(originalSurveyJson, responseData, passingScore = 70) {
  let totalCorrect = 0;
  let totalQuestions = 0;

  const questionMap = {};
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
      ? JSON.stringify([...correctAnswer].sort())
      : String(correctAnswer ?? '');

    if (normalizedStudent === normalizedCorrect) totalCorrect++;
  }

  const scorePercentage = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
    : 0;

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
export function stripSensitiveData(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) stripSensitiveData(item);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    delete obj.correctAnswer;
    delete obj.metadata;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) stripSensitiveData(value);
    }
  }
  return obj;
}
