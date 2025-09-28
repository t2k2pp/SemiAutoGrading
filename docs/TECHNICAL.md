# IPA PM試験採点システム 技術詳細ドキュメント

## 目次
1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [技術スタック](#技術スタック)
3. [データモデル](#データモデル)
4. [API設計](#api設計)
5. [LLM統合](#llm統合)
6. [状態管理](#状態管理)
7. [セキュリティ](#セキュリティ)
8. [パフォーマンス](#パフォーマンス)
9. [テスト戦略](#テスト戦略)
10. [デプロイメント](#デプロイメント)

## アーキテクチャ概要

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Components   │ │   Contexts   │ │   Services   │    │
│  │              │ │              │ │              │    │
│  │ - ExamSetup  │ │ - AppContext │ │ - LLMService │    │
│  │ - Grading    │ │ - State Mgmt │ │ - DataService│    │
│  │ - Export     │ │              │ │ - CSVService │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
├─────────────────────────────────────────────────────────┤
│                 Browser Storage                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  IndexedDB   │ │ LocalStorage │ │ SessionStorage│   │
│  │ (Main Data)  │ │ (Settings)   │ │ (Temp Data)  │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────┐
│                External LLM APIs                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  LM Studio   │ │   Ollama     │ │ Azure OpenAI │    │
│  │ (Local API)  │ │ (Local API)  │ │ (Cloud API)  │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                ┌──────────────┐                        │
│                │ Google Gemini│                        │
│                │ (Cloud API)  │                        │
│                └──────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

### 設計原則

1. **単一責任原則**: 各コンポーネントは明確な責任を持つ
2. **疎結合**: モジュール間の依存性を最小化
3. **再利用性**: 共通機能のサービス化
4. **型安全性**: TypeScriptによる静的型チェック
5. **ユーザビリティ**: 直感的なUI/UX設計

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|------------|------|
| React | 19.1.1 | UIライブラリ |
| TypeScript | 5.8.3 | 型安全な開発 |
| Vite | 7.1.7 | ビルドツール |
| ESLint | 9.36.0 | コード品質管理 |

### 状態管理

| 技術 | 用途 |
|------|------|
| React Context | グローバル状態管理 |
| useReducer | 複雑な状態更新 |
| useState | ローカル状態管理 |

### データ永続化

| 技術 | 用途 |
|------|------|
| IndexedDB | メインデータストレージ |
| LocalStorage | 設定情報保存 |
| SessionStorage | 一時データ保存 |

### 外部API

| サービス | プロトコル | 認証 |
|----------|-----------|------|
| LM Studio | HTTP/REST | Bearer Token |
| Ollama | HTTP/REST | None |
| Azure OpenAI | HTTPS/REST | API Key |
| Google Gemini | HTTPS/REST | API Key |

## データモデル

### エンティティ関係図

```
Exam (試験)
├── id: string
├── name: string
├── description: string
├── questions: Question[]
├── createdAt: Date
└── updatedAt: Date
     │
     │ 1:N
     ▼
Question (問題/ケース)
├── id: string
├── examId: string
├── number: string
├── caseStudyTitle: string
├── backgroundDescription: string
└── subQuestions: SubQuestion[]
     │
     │ 1:N
     ▼
SubQuestion (設問)
├── id: string
├── questionId: string
├── number: string
├── content: string
├── intention: string
├── sampleAnswer: string
├── maxScore: number
└── characterLimit?: number
     │
     │ 1:N
     ▼
Answer (回答)
├── id: string
├── examId: string
├── studentId: string
├── questionId: string
├── subQuestionId: string
├── content: string
├── characterCount: number
└── createdAt: Date
     │
     │ 1:1
     ▼
GradingResult (採点結果)
├── id: string
├── answerId: string
├── firstGrade: FirstGrade
└── secondGrade?: SecondGrade
```

### 型定義詳細

#### 基本エンティティ

```typescript
// 試験
interface Exam {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

// 問題（ケーススタディ）
interface Question {
  id: string;
  examId: string;
  number: string; // 問1、問2など
  caseStudyTitle: string; // ケーススタディのタイトル
  backgroundDescription: string; // 長文の背景説明
  subQuestions: SubQuestion[]; // 複数の設問
}

// 設問
interface SubQuestion {
  id: string;
  questionId: string;
  number: string; // 設問1、設問2など
  content: string; // 設問の内容
  intention: string; // 設問の意図
  sampleAnswer: string; // 模範解答
  maxScore: number; // 配点
  characterLimit?: number; // 文字数制限（オプション）
}

// 回答
interface Answer {
  id: string;
  examId: string;
  studentId: string;
  questionId: string;
  subQuestionId: string; // 設問のID
  content: string;
  characterCount: number; // 文字数カウント
  createdAt: Date;
}
```

#### 採点関連

```typescript
type GradeScore = '○' | '△' | '×';

// 一次採点
interface FirstGrade {
  score: GradeScore;
  points: number;
  reason: string;
  gradedAt: Date;
  graderId: string;
}

// 二次採点
interface SecondGrade {
  score: GradeScore;
  points: number;
  reason: string;
  gradedAt: Date;
  graderId: string;
  changes: string; // 変更内容
}

// 採点結果
interface GradingResult {
  id: string;
  answerId: string;
  firstGrade: FirstGrade;
  secondGrade?: SecondGrade;
}
```

#### LLM設定

```typescript
type LLMProvider = 'lm-studio' | 'ollama' | 'azure-openai' | 'gemini';

interface LLMConfig {
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
```

## API設計

### LLMサービス統合

#### 共通インターフェース

```typescript
interface LLMGradingResponse {
  score: '○' | '△' | '×';
  points: number;
  reason: string;
  confidence: number;
}

interface LLMService {
  // 接続テスト
  testConnection(): Promise<boolean>;

  // 利用可能モデル取得
  getAvailableModels(): Promise<string[]>;

  // 採点実行
  gradeAnswer(question: Question, answer: Answer): Promise<LLMGradingResponse>;

  // バッチ採点
  gradeBatch(
    questions: Question[],
    answers: Answer[],
    onProgress?: (current: number, total: number) => void
  ): Promise<LLMGradingResponse[]>;

  // 一貫性チェック
  checkConsistency(
    question: Question,
    answer: Answer,
    iterations: number
  ): Promise<{
    results: LLMGradingResponse[];
    isConsistent: boolean;
    variance: number;
  }>;
}
```

#### プロバイダー固有実装

**LM Studio / Ollama (OpenAI互換)**

```typescript
// リクエスト形式
interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature: number;
  max_tokens?: number;
}

// レスポンス形式
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
```

**Azure OpenAI**

```typescript
// ヘッダー
{
  'Content-Type': 'application/json',
  'api-key': apiKey
}

// URL形式
// v1 API: {endpoint}/openai/v1/chat/completions
// Traditional: {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={version}
```

**Google Gemini**

```typescript
// リクエスト形式
interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens?: number;
  };
}

// レスポンス形式
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}
```

### データサービス

#### IndexedDB操作

```typescript
interface DataService {
  // 初期化
  initDB(): Promise<void>;

  // 試験操作
  saveExam(exam: Exam): Promise<void>;
  getExam(id: string): Promise<Exam | null>;
  getAllExams(): Promise<Exam[]>;
  deleteExam(id: string): Promise<void>;

  // 回答操作
  saveAnswer(answer: Answer): Promise<void>;
  getAnswersByExamId(examId: string): Promise<Answer[]>;
  deleteAnswer(id: string): Promise<void>;

  // 採点結果操作
  saveGradingResult(result: GradingResult): Promise<void>;
  getGradingResultsByExamId(examId: string): Promise<GradingResult[]>;
  updateGradingResult(result: GradingResult): Promise<void>;
}
```

## LLM統合

### 採点プロンプト設計

#### システムプロンプト

```
You are a grader for the IPA Project Manager certification exam.
Grade the answer according to the following criteria and return the result in JSON format.

Grading criteria:
- ○: Equivalent to the sample answer (meets 80% or more elements)
- △: Partially correct (meets 50-79% of elements)
- ×: Incorrect or off-topic (less than 50%)

Return the output in the following JSON format:
{
  "score": "○" | "△" | "×",
  "points": numeric_score,
  "reason": "grading_reason_within_100_chars"
}
```

#### ユーザープロンプト

```
QUESTION:
{question.content}

QUESTION INTENT:
{question.intention}

SAMPLE ANSWER:
{question.sampleAnswer}

MAX SCORE: {question.maxScore} points

STUDENT ANSWER TO GRADE:
Student ID: {answer.studentId}
Answer Content: {answer.content}

GRADING CRITERIA:
- Does the answer accurately understand the question requirements?
- Does the answer align with the question intent?
- How much does the answer include elements from the sample answer?
- Are appropriate PM knowledge and expressions used?
- Is the content logical and consistent?

Please grade the student answer based on the above information and return the result in JSON format.
```

### エラーハンドリング

#### LLM応答解析

```typescript
// JSON解析処理
try {
  // ```json ``` で囲まれている場合の処理
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    gradingResult = JSON.parse(jsonMatch[1]);
  } else {
    gradingResult = JSON.parse(content);
  }
} catch (parseError) {
  // JSONパースに失敗した場合、正規表現でマニュアル抽出
  gradingResult = extractGradingFromText(content);
}
```

#### フォールバック処理

```typescript
// テキストから採点結果を抽出（JSONパース失敗時）
private extractGradingFromText(text: string): LLMGradingResponse {
  const scorePatterns = [
    /["']?score["']?\s*:\s*["']([○△×])["']/,
    /score\s*:\s*([○△×])/,
    /([○△×])/
  ];

  const pointsPatterns = [
    /["']?points?["']?\s*:\s*(\d+)/,
    /points?\s*:\s*(\d+)/,
    /(\d+)\s*points?/
  ];

  // パターンマッチング処理...
}
```

### レート制限対応

```typescript
// API呼び出し間隔制御
for (let i = 0; i < answers.length; i++) {
  const result = await this.gradeAnswer(question, answers[i]);
  results.push(result);

  // API呼び出し間隔を空ける（レート制限対策）
  if (i < answers.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## 状態管理

### React Context + useReducer

#### アプリケーション状態

```typescript
interface AppState {
  currentExam: Exam | null;
  answers: Answer[];
  gradingResults: GradingResult[];
  llmConfig: LLMConfig;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_EXAM'; payload: Exam }
  | { type: 'SET_ANSWERS'; payload: Answer[] }
  | { type: 'ADD_GRADING_RESULT'; payload: GradingResult }
  | { type: 'UPDATE_GRADING_RESULT'; payload: GradingResult }
  | { type: 'SET_LLM_CONFIG'; payload: LLMConfig }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_DATA' };
```

#### Reducer実装

```typescript
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_EXAM':
      return {
        ...state,
        currentExam: action.payload,
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

    // その他のアクション...

    default:
      return state;
  }
}
```

#### Context Provider

```typescript
export function SimpleAppProvider({ children }: { children: ReactNode }) {
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
```

## セキュリティ

### データ保護

#### 機密情報の暗号化

```typescript
// APIキーの暗号化保存
class SecureStorage {
  private static readonly SECRET_KEY = 'app-secret-key';

  static encryptData(data: string): string {
    // 実装: 暗号化アルゴリズム
    return btoa(data); // 簡易実装（本格運用では強力な暗号化が必要）
  }

  static decryptData(encryptedData: string): string {
    // 実装: 復号化アルゴリズム
    return atob(encryptedData);
  }

  static saveSecureData(key: string, data: string): void {
    const encrypted = this.encryptData(data);
    localStorage.setItem(key, encrypted);
  }

  static getSecureData(key: string): string | null {
    const encrypted = localStorage.getItem(key);
    return encrypted ? this.decryptData(encrypted) : null;
  }
}
```

#### 入力検証

```typescript
// XSS対策
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// SQLインジェクション対策（IndexedDBではParameterized Queryを使用）
function validateStudentId(studentId: string): boolean {
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(studentId) && studentId.length <= 50;
}
```

### API セキュリティ

#### リクエスト検証

```typescript
// API リクエストの妥当性検証
function validateLLMRequest(config: LLMConfig, prompt: string): boolean {
  // エンドポイントURL検証
  try {
    new URL(config.endpoint);
  } catch {
    return false;
  }

  // プロンプト長制限
  if (prompt.length > 10000) {
    return false;
  }

  // 禁止文字列チェック
  const forbiddenPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i
  ];

  return !forbiddenPatterns.some(pattern => pattern.test(prompt));
}
```

#### レート制限

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 60; // 1分間に60リクエスト
  private readonly timeWindow = 60000; // 1分

  canMakeRequest(apiKey: string): boolean {
    const now = Date.now();
    const keyRequests = this.requests.get(apiKey) || [];

    // 時間窓外のリクエストを除去
    const validRequests = keyRequests.filter(
      time => now - time < this.timeWindow
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(apiKey, validRequests);
    return true;
  }
}
```

## パフォーマンス

### 最適化戦略

#### コンポーネント最適化

```typescript
// React.memo による不要な再レンダリング防止
const ExamSetup = React.memo(({ exam, onSave }: ExamSetupProps) => {
  // コンポーネント実装
});

// useMemo による計算結果のキャッシュ
const statistics = useMemo(() => {
  return calculateStatistics(gradingResults);
}, [gradingResults]);

// useCallback による関数の最適化
const handleSave = useCallback((exam: Exam) => {
  dispatch({ type: 'SET_EXAM', payload: exam });
}, [dispatch]);
```

#### 大量データ処理

```typescript
// 仮想化による大量リスト表示
const VirtualizedAnswerList = ({ answers }: { answers: Answer[] }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  const visibleAnswers = useMemo(() => {
    return answers.slice(visibleRange.start, visibleRange.end);
  }, [answers, visibleRange]);

  // スクロールイベントハンドリング
  const handleScroll = useCallback((event: React.UIEvent) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    const itemHeight = 100; // 1アイテムの高さ
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + Math.ceil(clientHeight / itemHeight) + 5, answers.length);

    setVisibleRange({ start, end });
  }, [answers.length]);

  return (
    <div onScroll={handleScroll} style={{ height: '500px', overflow: 'auto' }}>
      {visibleAnswers.map(answer => (
        <AnswerItem key={answer.id} answer={answer} />
      ))}
    </div>
  );
};
```

#### バッチ処理

```typescript
// 採点処理のバッチ化
async function batchGrading(
  answers: Answer[],
  batchSize: number = 5
): Promise<GradingResult[]> {
  const results: GradingResult[] = [];

  for (let i = 0; i < answers.length; i += batchSize) {
    const batch = answers.slice(i, i + batchSize);

    // 並列処理でバッチを処理
    const batchPromises = batch.map(answer =>
      llmService.gradeAnswer(question, answer)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 進捗報告
    onProgress?.(Math.min(i + batchSize, answers.length), answers.length);

    // バッチ間の待機時間
    if (i + batchSize < answers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
```

### メモリ管理

#### ガベージコレクション対応

```typescript
// 大きなオブジェクトの適切な解放
useEffect(() => {
  return () => {
    // コンポーネントアンマウント時のクリーンアップ
    setAnswers([]);
    setGradingResults([]);
  };
}, []);

// WeakMap による循環参照防止
const answerCache = new WeakMap<Answer, GradingResult>();

// メモリリーク防止のための定期クリーンアップ
useEffect(() => {
  const interval = setInterval(() => {
    // 一定時間経過した不要なデータを削除
    cleanupExpiredData();
  }, 300000); // 5分ごと

  return () => clearInterval(interval);
}, []);
```

## テスト戦略

### ユニットテスト

#### コンポーネントテスト

```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { ExamSetup } from './ExamSetup';

describe('ExamSetup', () => {
  test('新しい設問を追加できる', () => {
    render(<ExamSetup />);

    const addButton = screen.getByText('設問を追加');
    fireEvent.click(addButton);

    expect(screen.getAllByText(/設問/)).toHaveLength(2);
  });

  test('文字数制限が正しく表示される', () => {
    render(<ExamSetup />);

    const textarea = screen.getByPlaceholderText('設問の具体的な内容を入力');
    fireEvent.change(textarea, { target: { value: 'テスト入力' } });

    expect(screen.getByText('文字数: 5')).toBeInTheDocument();
  });
});
```

#### サービステスト

```typescript
// LLMサービスのテスト
import { LLMService } from './llmService';

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(() => {
    service = new LLMService(mockConfig);
  });

  test('採点結果を正しく解析する', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            score: '○',
            points: 8,
            reason: '模範解答の要素を適切に含んでいる'
          })
        }
      }]
    };

    // モックAPI応答
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await service.gradeAnswer(mockQuestion, mockAnswer);

    expect(result.score).toBe('○');
    expect(result.points).toBe(8);
    expect(result.reason).toContain('模範解答');
  });
});
```

### 統合テスト

#### E2Eテスト（Playwright）

```typescript
// E2Eテストシナリオ
import { test, expect } from '@playwright/test';

test('完全な採点フロー', async ({ page }) => {
  // 1. アプリケーションにアクセス
  await page.goto('http://localhost:5173');

  // 2. 試験を作成
  await page.click('text=試験設定');
  await page.fill('[placeholder="例：IPA PM試験 2024年度"]', 'テスト試験');
  await page.fill('[placeholder="設問の具体的な内容を入力"]', 'テスト設問');
  await page.click('text=試験を作成');

  // 3. LLM設定
  await page.click('text=LLM設定');
  await page.selectOption('select[name="provider"]', 'lm-studio');
  await page.fill('[name="endpoint"]', 'http://localhost:1234/v1');
  await page.click('text=設定を保存');

  // 4. CSV読み込み
  await page.click('text=CSV読み込み');
  await page.setInputFiles('input[type="file"]', 'test-data/sample.csv');

  // 5. 一次採点実行
  await page.click('text=一次採点');
  await page.click('text=採点を開始');

  // 結果確認
  await expect(page.locator('text=採点完了')).toBeVisible();
});
```

### パフォーマンステスト

#### 負荷テスト

```typescript
// 大量データでのパフォーマンステスト
describe('Performance Tests', () => {
  test('1000件の回答を5分以内で採点できる', async () => {
    const startTime = Date.now();
    const answers = generateMockAnswers(1000);

    const results = await llmService.gradeBatch(
      mockQuestions,
      answers,
      (current, total) => {
        console.log(`Progress: ${current}/${total}`);
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(1000);
    expect(duration).toBeLessThan(300000); // 5分以内
  });
});
```

## デプロイメント

### ビルド設定

#### Vite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          llm: ['./src/services/llmService.ts'],
          data: ['./src/services/dataService.ts']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
```

#### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 静的ホスティング

#### Netlify デプロイ

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### GitHub Pages デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 環境変数管理

```typescript
// 環境設定
interface EnvironmentConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_TIMEOUT: number;
  readonly VITE_MAX_FILE_SIZE: number;
}

const config: EnvironmentConfig = {
  NODE_ENV: (import.meta.env.NODE_ENV as any) || 'development',
  VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  VITE_API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 120000,
  VITE_MAX_FILE_SIZE: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760
};

export default config;
```

### モニタリング

#### エラー追跡

```typescript
// エラーレポート
class ErrorReporter {
  static report(error: Error, context?: any): void {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      context
    };

    // 本格運用では Sentry等のサービスを使用
    console.error('Error Report:', errorReport);

    // ローカルストレージに保存（デバッグ用）
    const existingReports = JSON.parse(
      localStorage.getItem('errorReports') || '[]'
    );
    existingReports.push(errorReport);
    localStorage.setItem('errorReports', JSON.stringify(existingReports));
  }
}

// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
  ErrorReporter.report(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorReporter.report(new Error(event.reason), {
    type: 'unhandledrejection'
  });
});
```

#### パフォーマンス監視

```typescript
// パフォーマンス測定
class PerformanceMonitor {
  static measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    return apiCall().finally(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`${name}: ${duration.toFixed(2)}ms`);

      // 性能データの記録
      this.recordMetric(name, duration);
    });
  }

  private static recordMetric(name: string, duration: number): void {
    const metrics = JSON.parse(
      localStorage.getItem('performanceMetrics') || '{}'
    );

    if (!metrics[name]) {
      metrics[name] = [];
    }

    metrics[name].push({
      duration,
      timestamp: Date.now()
    });

    // 古いデータを削除（最新100件のみ保持）
    if (metrics[name].length > 100) {
      metrics[name] = metrics[name].slice(-100);
    }

    localStorage.setItem('performanceMetrics', JSON.stringify(metrics));
  }
}
```

---

**更新履歴**:
- v1.0.0: 初版作成
- 今後のバージョンアップで随時更新予定