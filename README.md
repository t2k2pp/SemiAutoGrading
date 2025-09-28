# IPA PM試験採点システム (IPA PM Exam Grading System)

IPA（独立行政法人情報処理推進機構）のプロジェクトマネージャ試験の午後問題採点を支援するWebアプリケーションです。

## 🚀 **オンラインでお試し**
**👉 [GitHub Pagesで今すぐ利用](https://t2k2pp.github.io/SemiAutoGrading/)**

サーバー設定不要でブラウザから直接利用できます！

## 🎯 機能概要 (Features)

### ✅ 実装済み機能
- **IPA試験形式対応**: ケーススタディ形式での複数設問管理
- **問題作成**: 背景説明と複数設問を含む問題の作成・編集
- **文字数管理**: リアルタイム文字数表示と制限設定
- **マルチLLM対応**: 複数のAIプロバイダーとの連携
  - LM Studio (OpenAI互換)
  - Ollama
  - Azure OpenAI
  - Google Gemini API
- **採点機能**: AI による一次採点と人間による二次採点
- **データ管理**: IndexedDBによるローカルデータ保存
- **結果エクスポート**: 採点結果のCSV/Excel出力

### 🚧 開発予定機能
- **CSV/JSON取り込み**: 回答データの一括取り込み
- **採点一貫性チェック**: 複数回採点による品質確認
- **統計機能**: 採点結果の分析とレポート生成

## 🏗️ 技術構成 (Technology Stack)

- **フロントエンド**: React 18 + TypeScript + Vite
- **状態管理**: React useReducer + Context API
- **データ保存**: IndexedDB (Dexie.js)
- **UI**: カスタムCSS（レスポンシブ対応）
- **LLM統合**: REST API（各プロバイダー対応）

## 🚀 セットアップ (Setup)

### 前提条件 (Prerequisites)
- Node.js 18以上
- npm または yarn

### インストール (Installation)

```bash
# リポジトリのクローン
git clone https://github.com/t2k2pp/SemiAutoGrading.git
cd SemiAutoGrading

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

アプリケーションは `http://localhost:5173` で起動します。

### ビルド (Build)

```bash
# プロダクション用ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## 📖 使用方法 (Usage)

### 1. 試験設定
1. 「試験設定」タブで新しい試験を作成
2. ケーススタディタイトルと背景説明を入力
3. 複数の設問を追加（設問内容、出題意図、配点、文字制限）
4. 「サンプル試験を読み込み」でIPA形式の例を確認可能

### 2. LLM設定
1. 「LLM設定」タブでAIプロバイダーを選択
2. エンドポイント、モデル、パラメータを設定
3. 接続テストで動作確認

### 3. 回答データ読み込み
1. 「CSV読み込み」タブで回答データをアップロード
2. 形式: `student_id, question_number, answer_content`

### 4. 採点実行
1. 「一次採点」でAI採点を実行
2. 「二次採点」で人間による確認・調整
3. 「エクスポート」で結果を出力

## 🗂️ プロジェクト構造 (Project Structure)

```
src/
├── components/          # Reactコンポーネント
│   ├── ExamSetup.tsx   # 試験設定画面
│   ├── CsvUpload.tsx   # CSV読み込み画面
│   ├── FirstGrading.tsx # 一次採点画面
│   ├── SecondGrading.tsx # 二次採点画面
│   ├── LLMSettings.tsx # LLM設定画面
│   └── ...
├── contexts/           # React Context（状態管理）
│   └── SimpleAppContext.tsx
├── services/           # ビジネスロジック
│   ├── llmService.ts   # LLM API連携
│   ├── csvService.ts   # CSV処理
│   ├── dataService.ts  # データ永続化
│   └── ...
└── types/              # TypeScript型定義
```

## 🔧 LLMプロバイダー設定 (LLM Provider Configuration)

### LM Studio
```
エンドポイント: http://127.0.0.1:1234/v1
モデル: お使いのモデル名
```

### Ollama
```
エンドポイント: http://localhost:11434/v1
モデル: llama2, gemma等
```

### Azure OpenAI
```
エンドポイント: https://your-resource.openai.azure.com
APIキー: あなたのAPIキー
APIバージョン: 2024-02-01
デプロイメントID: あなたのデプロイメント名
```

### Google Gemini
```
エンドポイント: https://generativelanguage.googleapis.com/v1beta
モデル: gemini-pro
APIキー: あなたのAPIキー
```

## 📋 CSV形式 (CSV Format)

回答データのCSV形式：

```csv
student_id,question_number,answer_content
S001,問1-設問1,プロジェクト管理における...
S001,問1-設問2,要件定義では...
S002,問1-設問1,システム開発において...
```

## 🤝 コントリビューション (Contributing)

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス (License)

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞 (Acknowledgments)

- IPA（独立行政法人情報処理推進機構）の試験制度
- React、TypeScript、Viteコミュニティ
- 各LLMプロバイダーのAPI提供

---

**🤖 Generated with [Claude Code](https://claude.ai/code)**