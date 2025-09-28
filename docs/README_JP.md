# IPA PM試験採点システム

## 概要

このシステムは、IPA（独立行政法人情報処理推進機構）のプロジェクトマネージャ試験の午後問題採点を支援するWebアプリケーションです。AIによる一次採点と人間による二次採点の両方をサポートし、効率的で一貫性のある採点を実現します。

## 主な特徴

### 🎯 IPA試験形式対応
- **ケーススタディ形式**: 長文の背景説明と複数の設問を含む問題構造
- **階層的管理**: 問題（ケース）→ 設問（SubQuestion）の階層構造
- **文字数管理**: リアルタイム文字数表示と制限設定

### 🤖 AI採点機能
- **マルチプロバイダー対応**: LM Studio、Ollama、Azure OpenAI、Google Gemini
- **採点基準**: ○（80%以上）、△（50-79%）、×（50%未満）
- **採点理由**: AIによる詳細な採点根拠の提供

### 👥 人間による二次採点
- **一次採点結果の確認**: AI採点結果のレビューと調整
- **採点基準の統一**: 複数採点者間での一貫性確保
- **変更履歴**: 二次採点での変更内容の記録

### 📊 データ管理
- **ローカルストレージ**: IndexedDBによる安全なデータ保存
- **CSV対応**: 回答データの一括取り込み（予定）
- **エクスポート機能**: 採点結果のCSV/Excel出力

## 画面構成

### 1. ホーム画面
- 現在の試験状況の表示
- 問題数、回答数、採点済み数の確認
- クイックアクションボタン

### 2. 試験設定画面
- 新しい試験の作成・編集
- ケーススタディタイトルと背景説明の入力
- 複数設問の追加・削除・編集
- サンプル試験の読み込み

### 3. CSV読み込み画面
- 回答データのアップロード
- データ形式の検証
- 取り込み結果の確認

### 4. 一次採点画面
- AI採点の実行
- 採点進捗の表示
- 採点結果の確認

### 5. 二次採点画面
- 一次採点結果のレビュー
- 採点の調整・変更
- 最終結果の確定

### 6. LLM設定画面
- AIプロバイダーの選択・設定
- 接続テスト
- パラメータ調整

### 7. エクスポート画面
- 採点結果の出力
- 形式選択（CSV、Excel等）
- 統計情報の表示

## 技術仕様

### フロントエンド
- **React 18**: 最新のReactフレームワーク
- **TypeScript**: 型安全な開発
- **Vite**: 高速な開発環境
- **カスタムCSS**: レスポンシブデザイン

### 状態管理
- **React Context**: グローバル状態管理
- **useReducer**: 複雑な状態更新の管理

### データ永続化
- **IndexedDB**: ブラウザ内でのデータ保存
- **Dexie.js**: IndexedDBのラッパーライブラリ

### AI統合
- **REST API**: 各プロバイダーとのHTTP通信
- **OpenAI互換**: 標準的なAPI形式への対応
- **プロバイダー固有API**: Gemini等の独自形式への対応

## データ構造

### 試験（Exam）
```typescript
interface Exam {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 問題（Question）
```typescript
interface Question {
  id: string;
  examId: string;
  number: string; // 問1、問2など
  caseStudyTitle: string; // ケーススタディのタイトル
  backgroundDescription: string; // 長文の背景説明
  subQuestions: SubQuestion[]; // 複数の設問
}
```

### 設問（SubQuestion）
```typescript
interface SubQuestion {
  id: string;
  questionId: string;
  number: string; // 設問1、設問2など
  content: string; // 設問の内容
  intention: string; // 設問の意図
  sampleAnswer: string; // 模範解答
  maxScore: number; // 配点
  characterLimit?: number; // 文字数制限
}
```

### 回答（Answer）
```typescript
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

### 採点結果（GradingResult）
```typescript
interface GradingResult {
  id: string;
  answerId: string;
  firstGrade: FirstGrade; // 一次採点
  secondGrade?: SecondGrade; // 二次採点（任意）
}
```

## セキュリティ考慮事項

### データ保護
- **ローカルストレージ**: 機密データはブラウザ内に保存
- **APIキー管理**: LLMプロバイダーのAPIキーは暗号化して保存
- **データ暗号化**: 重要な設定情報の暗号化

### プライバシー
- **個人情報**: 学生IDは仮名化を推奨
- **データ削除**: 不要になったデータの完全削除
- **アクセス制御**: 適切な権限管理

## 運用ガイドライン

### 採点品質の確保
1. **サンプル採点**: 少数の回答で採点精度を確認
2. **一貫性チェック**: 同じ回答の複数回採点で安定性確認
3. **人間による確認**: AI採点結果の適切なレビュー

### データ管理
1. **定期バックアップ**: 重要データの外部保存
2. **データ整合性**: 定期的な整合性チェック
3. **容量管理**: ストレージ使用量の監視

### トラブルシューティング
1. **ログ確認**: ブラウザコンソールでのエラー確認
2. **設定リセット**: 問題時の設定初期化
3. **データ復旧**: バックアップからの復元手順

## 今後の機能拡張

### 短期目標
- CSV/JSON一括取り込み機能の完成
- 採点統計・分析機能の追加
- ユーザーインターフェースの改善

### 中期目標
- 複数試験の並行管理
- チーム採点機能
- カスタム採点基準の設定

### 長期目標
- クラウド連携機能
- リアルタイム協調採点
- 機械学習による採点精度向上

---

**開発者向け情報**: [技術詳細ドキュメント](./TECHNICAL.md)

**ユーザー向け情報**: [使用方法ガイド](./USER_GUIDE.md)