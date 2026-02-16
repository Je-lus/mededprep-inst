// Assessment types
export interface Assessment {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed';
  publicHash: string;
  resultsReleased: boolean;
  showScoreFeedback: boolean;
  allowStudentReview?: boolean;
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

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  studentEmail: string;
  studentName: string;
  attempt?: number;
  totalQuestions?: number;
  totalCorrect?: number;
  scorePercentage?: number;
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
  allowStudentReview?: boolean;
}

export interface AssessmentSubmitResult {
  responseId: string;
  totalQuestions?: number;
  totalCorrect?: number;
  scorePercentage?: number;
  passed?: boolean;
}

// Student review
export interface ReviewQuestion {
  questionName: string;
  questionTitle: string;
  choices: { value: string; text: string }[];
  studentAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean;
  explanation: string | null;
  pageNumber: string | null;
}

export interface AssessmentReviewData {
  assessment: { title: string; description?: string };
  totalQuestions: number;
  totalCorrect: number;
  scorePercentage: number;
  questions: ReviewQuestion[];
}

// Admin response detail
export interface ResponseDetail {
  response: {
    id: string;
    studentName: string;
    studentEmail: string;
    scorePercentage?: number;
    totalCorrect?: number;
    totalQuestions?: number;
    passed?: boolean;
    timeTaken?: number;
    completedAt?: string;
  };
  questions: ReviewQuestion[];
}

// Bug Report types
export interface BugReport {
  id: string;
  orgId: string;
  reporterType: 'admin' | 'student' | 'anonymous';
  reporterId?: string | null;
  reporterEmail?: string | null;
  reporterName?: string | null;
  category: 'bug' | 'feedback' | 'feature_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  stepsToReproduce?: string | null;
  url?: string | null;
  userAgent?: string | null;
  viewport?: string | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  screenshotUrl?: string | null;
  status: 'pending' | 'acknowledged' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface BugReportSubmission {
  category: 'bug' | 'feedback' | 'feature_request';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  stepsToReproduce?: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  errorMessage?: string;
  errorStack?: string;
  screenshot?: string; // base64 data
}

// Question Bank types
export interface QuestionBank {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  createdAt: string;
  _count?: { items: number };
}

export interface QuestionBankItem {
  id: string;
  bankId: string;
  questionData: SurveyElement;
  tags: string[];
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface QuestionBankDetail extends QuestionBank {
  items: QuestionBankItem[];
}

// Attendance & Session types
export type AttendanceStatus = 'registered' | 'checked_in' | 'attended' | 'no_show' | 'cancelled';

export interface Session {
  id: string;
  name: string;
  description?: string;
  publicHash: string;
  isPublished: boolean;
  startDateTime?: string;
  endDateTime?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { attendees: number };
}

export interface SessionDetail extends Session {
  attendees: SessionAttendee[];
}

export interface SessionAttendee {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PublicSessionInfo {
  id: string;
  name: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  isPublished: boolean;
  org?: { name: string };
  checkInWindow: { allowed: boolean; reason?: string | null };
  checkOutWindow: { allowed: boolean; reason?: string | null };
}

export interface AttendeeRegistrationResult {
  studentId: string;
  attendeeId: string;
}

export interface StudentLookupResult {
  found: boolean;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CheckOutResult {
  alreadyCheckedOut: boolean;
  checkedOutAt: string;
  studentName: string;
}

export interface SessionQrCodes {
  checkIn: QrCodeData;
  checkOut: QrCodeData;
}

// Instructor types
export interface Instructor {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
