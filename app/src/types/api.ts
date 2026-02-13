// Assessment types
export interface Assessment {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed';
  publicHash: string;
  resultsReleased: boolean;
  passingScore?: number;
  timeLimitMinutes?: number;
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number };
}

export interface AssessmentDetail extends Assessment {
  surveyJson: SurveyJson;
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  studentEmail: string;
  studentName: string;
  totalQuestions?: number;
  totalCorrect?: number;
  scorePercentage?: string;
  passed?: boolean;
  timeTaken?: number;
  startedAt: string;
  completedAt?: string;
}

export interface QuestionAnalysis {
  questionName: string;
  questionTitle: string;
  questionCode: string;
  chapter?: string;
  difficulty?: number;
  totalResponses: number;
  correctAnswer: string;
  percentCorrect: number;
  choiceDistribution: ChoiceDistribution[];
  pointBiserial: number;
}

export interface ChoiceDistribution {
  value: string;
  text: string;
  count: number;
  percent: number;
}

export interface ItemAnalysisResult {
  totalResponses: number;
  totalQuestions: number;
  averageScore: number;
  questions: QuestionAnalysis[];
}

// SurveyJS types
export interface SurveyJson {
  pages?: SurveyPage[];
  showTimer?: boolean;
  timeLimit?: number;
  [key: string]: unknown;
}

export interface SurveyPage {
  name?: string;
  title?: string;
  description?: string;
  elements?: SurveyElement[];
}

export interface SurveyElement {
  type: string;
  name: string;
  title?: string;
  description?: string;
  isRequired?: boolean;
  choices?: SurveyChoice[];
  correctAnswer?: string | string[];
  metadata?: QuestionMetadata;
  html?: string;
  rows?: SurveyChoice[];
  columns?: SurveyChoice[];
  rateMax?: number;
  [key: string]: unknown;
}

export type SurveyChoice = string | { value: string; text: string };

export interface QuestionMetadata {
  chapter?: string;
  questionCode?: string;
  difficulty?: number;
  category?: string;
  subTopics?: string;
  explanation?: string;
  pageNumber?: string;
}

// QR Code
export interface QrCodeData {
  url: string;
  qrCode: string;
}

// Public assessment
export interface PublicAssessmentInfo {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
  timeLimitMinutes?: number;
}

export interface AssessmentSubmitResult {
  responseId: string;
  totalQuestions?: number;
  totalCorrect?: number;
  scorePercentage?: string;
  passed?: boolean;
}

// Student review
export interface ReviewQuestion {
  questionName: string;
  questionTitle: string;
  choices: { value: string; text: string }[];
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  pageNumber?: string;
}

export interface AssessmentReviewData {
  assessment: { title: string; description?: string };
  totalQuestions: number;
  totalCorrect: number;
  scorePercentage: string;
  questions: ReviewQuestion[];
}
