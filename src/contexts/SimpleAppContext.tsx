import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { dataService } from '../services/dataService';

// 型定義を直接ここに配置

// 設問（各問題の中の個別の質問）
export interface SubQuestion {
  id: string;
  questionId: string;
  number: string; // 設問1、設問2など
  content: string; // 設問の内容
  intention: string; // 設問の意図
  sampleAnswer: string; // 模範解答
  maxScore: number; // 配点
  characterLimit?: number; // 文字数制限（オプション）
}

// 問題（ケーススタディ）
export interface Question {
  id: string;
  examId: string;
  number: string; // 問1、問2など
  caseStudyTitle: string; // ケーススタディのタイトル
  backgroundDescription: string; // 長文の背景説明
  subQuestions: SubQuestion[]; // 複数の設問
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
  subQuestionId: string; // 設問のID
  content: string;
  characterCount: number; // 文字数カウント
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

export type LLMProvider = 'lm-studio' | 'ollama' | 'azure-openai' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  useMaxTokens: boolean; // 最大トークン数制限を使用するかどうか
  timeout: number;
  // Azure OpenAI specific
  apiKey?: string;
  apiVersion?: string;
  deploymentId?: string;
  // Gemini specific
  geminiApiKey?: string;
  // Ollama specific
  ollamaHost?: string;
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
    provider: 'lm-studio',
    endpoint: 'http://127.0.0.1:1234/v1',
    model: 'gemma-3n-e4b-it-text',
    temperature: 0.1,
    maxTokens: 500,
    useMaxTokens: true, // デフォルトは制限あり
    timeout: 120000,
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
        llmConfig: state.llmConfig,
      };

    default:
      return state;
  }
}

// Context
const SimpleAppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

// Provider
interface SimpleAppProviderProps {
  children: ReactNode;
}

export function SimpleAppProvider({ children }: SimpleAppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // データベース初期化
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await dataService.initDB();
        console.log('IndexedDB初期化完了');
      } catch (error) {
        console.error('IndexedDB初期化エラー:', error);
        dispatch({
          type: 'SET_ERROR',
          payload: 'データベースの初期化に失敗しました'
        });
      }
    };

    initializeDB();
  }, []);

  return (
    <SimpleAppContext.Provider value={{ state, dispatch }}>
      {children}
    </SimpleAppContext.Provider>
  );
}

// Hook
export function useSimpleApp() {
  const context = useContext(SimpleAppContext);
  if (!context) {
    throw new Error('useSimpleApp must be used within a SimpleAppProvider');
  }
  return context;
}