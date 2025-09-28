import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

// 型定義をここに直接配置
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

// 初期状態
const initialState: AppState = {
  currentExam: null,
  answers: [],
  gradingResults: [],
  llmConfig: {
    endpoint: 'http://localhost:1234/v1',
    model: 'gpt-4',
    temperature: 0.1,
    maxTokens: 500,
    timeout: 30000,
  },
  isLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_EXAM':
      return {
        ...state,
        currentExam: action.payload,
        error: null,
      };

    case 'SET_ANSWERS':
      return {
        ...state,
        answers: action.payload,
        error: null,
      };

    case 'ADD_GRADING_RESULT':
      return {
        ...state,
        gradingResults: [...state.gradingResults, action.payload],
        error: null,
      };

    case 'UPDATE_GRADING_RESULT':
      return {
        ...state,
        gradingResults: state.gradingResults.map(result =>
          result.id === action.payload.id ? action.payload : result
        ),
        error: null,
      };

    case 'SET_LLM_CONFIG':
      return {
        ...state,
        llmConfig: action.payload,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'CLEAR_DATA':
      return {
        ...initialState,
        llmConfig: state.llmConfig, // LLM設定は保持
      };

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}