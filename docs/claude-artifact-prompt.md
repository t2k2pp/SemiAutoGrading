# Claude アーティファクト用プロンプト - IPA試験採点システム

## 概要
IPA（情報処理推進機構）プロジェクトマネージャ試験のような記述式試験の自動採点を支援するWebアプリケーションをアーティファクトで作成してください。

## 要件

### 基本機能
1. **試験設定機能**: 試験の作成・編集（問題と設問の階層構造管理）
2. **回答データ管理**: 学生の回答データの手動入力・編集
3. **LLM一次採点**: 外部LLM APIを使用した自動採点
4. **採点結果表示**: 採点結果の一覧表示と詳細確認

### データ構造

#### 試験（Exam）
```typescript
interface Exam {
  id: string;
  name: string;          // 試験名（例：「令和6年度 春期 プロジェクトマネージャ試験」）
  description: string;   // 試験の説明
  questions: Question[]; // 問題一覧
}
```

#### 問題（Question）
```typescript
interface Question {
  id: string;
  number: string;        // 問題番号（例：「問1」）
  title: string;         // 問題タイトル
  description: string;   // 問題の説明・背景
  subQuestions: SubQuestion[]; // 設問一覧
}
```

#### 設問（SubQuestion）
```typescript
interface SubQuestion {
  id: string;
  number: string;        // 設問番号（例：「(1)」「(2)」）
  content: string;       // 設問文
  intention: string;     // 出題意図・評価ポイント
  keywords: string[];    // 期待キーワード
  maxScore: number;      // 満点
  scoreRubric: {         // 採点基準
    excellent: string;   // ○基準
    good: string;        // △基準
    poor: string;        // ×基準
  };
}
```

#### 回答（Answer）
```typescript
interface Answer {
  id: string;
  studentId: string;     // 学生ID
  questionId: string;    // 問題ID
  subQuestionId: string; // 設問ID
  content: string;       // 回答内容
  characterCount: number;// 文字数
}
```

#### 採点結果（GradingResult）
```typescript
interface GradingResult {
  id: string;
  answerId: string;
  firstGrade: {
    score: '○' | '△' | '×';  // 評価
    points: number;           // 点数
    reason: string;           // 採点理由
    gradedAt: Date;          // 採点日時
    graderId: string;        // 採点者ID
  };
}
```

## UI/UX要件

### レイアウト
- シングルページアプリケーション
- 上部にタブナビゲーション（試験設定、回答入力、一次採点、結果確認）
- レスポンシブデザイン対応

### 画面構成

#### 1. 試験設定タブ
- 試験情報入力フォーム（名前、説明）
- 問題一覧表示・追加・編集・削除
- 各問題の設問一覧表示・追加・編集・削除
- 設問詳細フォーム（設問文、出題意図、キーワード、採点基準）

#### 2. 回答入力タブ
- 学生別回答入力フォーム
- 設問選択→回答内容入力→文字数自動計算
- 回答一覧表示・編集・削除

#### 3. 一次採点タブ
- LLM設定（API設定は簡略化、モックでも可）
- 採点開始ボタン
- 採点進捗表示（プログレスバー、現在処理中の回答表示）
- 採点完了時の統計表示

#### 4. 結果確認タブ
- 採点結果一覧（学生ID、問題、評価、点数、採点理由）
- フィルタリング機能（評価別、学生別）
- 詳細表示（回答内容と採点結果の対比）

## 技術仕様

### フロントエンド
- **React 18** (CDN経由で読み込み)
- **CSS-in-JS**スタイリング
- **localStorage**でデータ永続化

### データ管理
- Reactの`useState`と`useEffect`でローカル状態管理
- データのCRUD操作用カスタムフック

### LLM API連携（簡略版）
```javascript
// モック実装例
const mockLLMGrading = async (subQuestion, answer) => {
  // 実際のAPI呼び出しの代わりに、キーワードマッチングで簡単な採点
  const keywords = subQuestion.keywords;
  const content = answer.content.toLowerCase();

  let score = '×';
  let points = 0;
  let reason = '回答が不十分です。';

  const matchedKeywords = keywords.filter(keyword =>
    content.includes(keyword.toLowerCase())
  );

  if (matchedKeywords.length >= keywords.length * 0.8) {
    score = '○';
    points = subQuestion.maxScore;
    reason = `期待キーワード（${matchedKeywords.join('、')}）が含まれており、適切な回答です。`;
  } else if (matchedKeywords.length >= keywords.length * 0.5) {
    score = '△';
    points = Math.floor(subQuestion.maxScore * 0.6);
    reason = `一部のキーワード（${matchedKeywords.join('、')}）は含まれていますが、不足している要素があります。`;
  }

  return { score, points, reason };
};
```

## サンプルデータ

### サンプル試験データ
```javascript
const sampleExam = {
  id: 'exam1',
  name: '令和6年度 春期 プロジェクトマネージャ試験（練習）',
  description: 'プロジェクトマネジメントの基礎知識を問う記述式試験',
  questions: [
    {
      id: 'q1',
      number: '問1',
      title: 'プロジェクト計画',
      description: 'あなたは新システム開発プロジェクトのプロジェクトマネージャに任命されました。',
      subQuestions: [
        {
          id: 'sq1-1',
          number: '(1)',
          content: 'プロジェクト計画作成時に最も重要な要素を3つ挙げ、それぞれについて説明してください。',
          intention: 'プロジェクト計画の重要要素を理解しているか',
          keywords: ['スコープ', 'スケジュール', '品質', 'コスト', 'リスク', 'コミュニケーション'],
          maxScore: 20,
          scoreRubric: {
            excellent: '3つの要素を適切に挙げ、それぞれについて具体的に説明している',
            good: '2-3つの要素を挙げ、説明が一部不足している',
            poor: '要素の特定や説明が不適切または不十分'
          }
        }
      ]
    }
  ]
};
```

### サンプル回答データ
```javascript
const sampleAnswers = [
  {
    id: 'a1',
    studentId: 'S001',
    questionId: 'q1',
    subQuestionId: 'sq1-1',
    content: 'プロジェクト計画で重要な要素は、1)スコープの明確化、2)スケジュール管理、3)品質管理です。スコープでは要件を明確にし、スケジュールでは各タスクの順序と期間を定義し、品質では成果物の品質基準を設定します。',
    characterCount: 102
  }
];
```

## スタイリング方針

### デザインシステム
- **カラーパレット**:
  - プライマリ: #007bff (青)
  - セカンダリ: #6c757d (グレー)
  - 成功: #28a745 (緑)
  - 警告: #ffc107 (黄)
  - 危険: #dc3545 (赤)
- **タイポグラフィ**: システムフォント使用
- **スペーシング**: 8pxベースのグリッドシステム

### コンポーネントスタイル
- カードベースのレイアウト
- ボタンは角丸、適切なパディング
- フォームは見やすいラベルと入力フィールド
- 採点結果は○△×を色分け表示

## 実装指示

1. **1つのHTMLファイル**として実装
2. **React CDN**を使用してJSXをブラウザで直接実行
3. **CSS-in-JS**でスタイリング
4. **localStorage**でデータ永続化
5. **モック採点機能**でLLM APIを模擬
6. **レスポンシブ対応**

## 重要な注意点

- データのバリデーションを適切に実装
- エラーハンドリングを含める
- ユーザビリティを重視したUI設計
- 採点進捗の視覚的フィードバック
- 日本語の文字数計算を正確に実装

この仕様に基づいて、IPA試験採点システムのアーティファクトを作成してください。