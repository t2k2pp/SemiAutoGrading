// 基本的な型定義（段階的統合用）

export interface Question {
  id: string;
  examId: string;
  number: string;
  title: string;
  content: string;
  intention: string;
  sampleAnswer: string;
  maxScore: number;
}

export interface Exam {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Answer {
  id: string;
  examId: string;
  studentId: string;
  questionId: string;
  content: string;
  createdAt: Date;
}

export type GradeScore = '○' | '△' | '×';

export interface FirstGrade {
  score: GradeScore;
  points: number;
  reason: string;
  gradedAt: Date;
  graderId: string;
}

export interface SecondGrade {
  score: GradeScore;
  points: number;
  reason: string;
  gradedAt: Date;
  graderId: string;
  changes: string;
}

export interface GradingResult {
  id: string;
  answerId: string;
  firstGrade: FirstGrade;
  secondGrade?: SecondGrade;
}

export interface LLMConfig {
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface AppState {
  currentExam: Exam | null;
  answers: Answer[];
  gradingResults: GradingResult[];
  llmConfig: LLMConfig;
  isLoading: boolean;
  error: string | null;
}

export type AppAction =
  | { type: 'SET_EXAM'; payload: Exam }
  | { type: 'SET_ANSWERS'; payload: Answer[] }
  | { type: 'ADD_GRADING_RESULT'; payload: GradingResult }
  | { type: 'UPDATE_GRADING_RESULT'; payload: GradingResult }
  | { type: 'SET_LLM_CONFIG'; payload: LLMConfig }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_DATA' };