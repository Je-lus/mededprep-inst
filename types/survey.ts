export interface SurveyChoice {
  value: string;
  text: string;
}

export interface SurveyElementMetadata {
  chapter?: string | null;
  questionCode?: string;
  difficulty?: number | null;
  category?: string | null;
  subTopics?: string | null;
  explanation?: string | null;
  pageNumber?: string | null;
}

export interface SurveyElement {
  type: string;
  name: string;
  title?: string;
  isRequired?: boolean;
  choices?: (SurveyChoice | string)[];
  correctAnswer?: string | string[];
  metadata?: SurveyElementMetadata;
  [key: string]: unknown;
}

export interface SurveyPage {
  name: string;
  title?: string;
  elements: SurveyElement[];
}

export interface SurveyJson {
  pages: SurveyPage[];
  showTimer?: boolean;
  timeLimit?: number;
  [key: string]: unknown;
}

export type ResponseData = Record<string, unknown>;
