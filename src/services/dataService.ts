import type { Exam, Question, Answer, GradingResult, LLMConfig } from '../contexts/SimpleAppContext';

// IndexedDB設定
const DB_NAME = 'IPAGraderDB';
const DB_VERSION = 1;

// オブジェクトストア名
const STORES = {
  EXAMS: 'exams',
  QUESTIONS: 'questions',
  ANSWERS: 'answers',
  GRADING_RESULTS: 'gradingResults',
};

// LocalStorage キー
const STORAGE_KEYS = {
  LLM_CONFIG: 'ipa-grader-llm-config',
  UI_SETTINGS: 'ipa-grader-ui-settings',
};

class DataService {
  private db: IDBDatabase | null = null;

  // IndexedDB初期化
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('IndexedDB初期化に失敗しました'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Examsストア
        if (!db.objectStoreNames.contains(STORES.EXAMS)) {
          const examStore = db.createObjectStore(STORES.EXAMS, { keyPath: 'id' });
          examStore.createIndex('name', 'name', { unique: false });
          examStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Questionsストア
        if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
          const questionStore = db.createObjectStore(STORES.QUESTIONS, { keyPath: 'id' });
          questionStore.createIndex('examId', 'examId', { unique: false });
          questionStore.createIndex('number', 'number', { unique: false });
        }

        // Answersストア
        if (!db.objectStoreNames.contains(STORES.ANSWERS)) {
          const answerStore = db.createObjectStore(STORES.ANSWERS, { keyPath: 'id' });
          answerStore.createIndex('examId', 'examId', { unique: false });
          answerStore.createIndex('studentId', 'studentId', { unique: false });
          answerStore.createIndex('questionId', 'questionId', { unique: false });
        }

        // GradingResultsストア
        if (!db.objectStoreNames.contains(STORES.GRADING_RESULTS)) {
          const resultStore = db.createObjectStore(STORES.GRADING_RESULTS, { keyPath: 'id' });
          resultStore.createIndex('answerId', 'answerId', { unique: true });
        }
      };
    });
  }

  // 汎用的なIndexedDB操作メソッド
  private async performDBOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('データベースが初期化されていません');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`データベース操作に失敗しました: ${request.error}`));
    });
  }

  private async performDBReadOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('データベースが初期化されていません');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`データベース読み取りに失敗しました: ${request.error}`));
    });
  }

  // Exam関連操作
  async saveExam(exam: Exam): Promise<void> {
    await this.performDBOperation(STORES.EXAMS, store => store.put(exam));

    // 関連する質問も保存
    for (const question of exam.questions) {
      await this.saveQuestion(question);
    }
  }

  async getExam(id: string): Promise<Exam | null> {
    const exam = await this.performDBReadOperation(STORES.EXAMS, store => store.get(id));
    if (!exam) return null;

    // 質問を取得
    const questions = await this.getQuestionsByExamId(id);
    return { ...exam, questions };
  }

  async getAllExams(): Promise<Exam[]> {
    const exams = await this.performDBReadOperation(STORES.EXAMS, store => store.getAll());

    // 各試験の質問を取得
    const examsWithQuestions: Exam[] = [];
    for (const exam of exams) {
      const questions = await this.getQuestionsByExamId(exam.id);
      examsWithQuestions.push({ ...exam, questions });
    }

    return examsWithQuestions;
  }

  async deleteExam(id: string): Promise<void> {
    await this.performDBOperation(STORES.EXAMS, store => store.delete(id));

    // 関連データも削除
    const questions = await this.getQuestionsByExamId(id);
    for (const question of questions) {
      await this.deleteQuestion(question.id);
    }

    const answers = await this.getAnswersByExamId(id);
    for (const answer of answers) {
      await this.deleteAnswer(answer.id);
    }
  }

  // Question関連操作
  async saveQuestion(question: Question): Promise<void> {
    await this.performDBOperation(STORES.QUESTIONS, store => store.put(question));
  }

  async getQuestion(id: string): Promise<Question | null> {
    return await this.performDBReadOperation(STORES.QUESTIONS, store => store.get(id));
  }

  async getQuestionsByExamId(examId: string): Promise<Question[]> {
    return await this.performDBReadOperation(STORES.QUESTIONS, store => {
      const index = store.index('examId');
      return index.getAll(examId);
    });
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.performDBOperation(STORES.QUESTIONS, store => store.delete(id));
  }

  // Answer関連操作
  async saveAnswer(answer: Answer): Promise<void> {
    await this.performDBOperation(STORES.ANSWERS, store => store.put(answer));
  }

  async getAnswer(id: string): Promise<Answer | null> {
    return await this.performDBReadOperation(STORES.ANSWERS, store => store.get(id));
  }

  async getAnswersByExamId(examId: string): Promise<Answer[]> {
    return await this.performDBReadOperation(STORES.ANSWERS, store => {
      const index = store.index('examId');
      return index.getAll(examId);
    });
  }

  async getAnswersByStudentId(studentId: string): Promise<Answer[]> {
    return await this.performDBReadOperation(STORES.ANSWERS, store => {
      const index = store.index('studentId');
      return index.getAll(studentId);
    });
  }

  async deleteAnswer(id: string): Promise<void> {
    await this.performDBOperation(STORES.ANSWERS, store => store.delete(id));

    // 関連する採点結果も削除
    const gradingResult = await this.getGradingResultByAnswerId(id);
    if (gradingResult) {
      await this.deleteGradingResult(gradingResult.id);
    }
  }

  // GradingResult関連操作
  async saveGradingResult(result: GradingResult): Promise<void> {
    await this.performDBOperation(STORES.GRADING_RESULTS, store => store.put(result));
  }

  async getGradingResult(id: string): Promise<GradingResult | null> {
    return await this.performDBReadOperation(STORES.GRADING_RESULTS, store => store.get(id));
  }

  async getGradingResultByAnswerId(answerId: string): Promise<GradingResult | null> {
    return await this.performDBReadOperation(STORES.GRADING_RESULTS, store => {
      const index = store.index('answerId');
      return index.get(answerId);
    });
  }

  async getAllGradingResults(): Promise<GradingResult[]> {
    return await this.performDBReadOperation(STORES.GRADING_RESULTS, store => store.getAll());
  }

  async deleteGradingResult(id: string): Promise<void> {
    await this.performDBOperation(STORES.GRADING_RESULTS, store => store.delete(id));
  }

  // LocalStorage操作（設定など）
  saveLLMConfig(config: LLMConfig): void {
    localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, JSON.stringify(config));
  }

  getLLMConfig(): LLMConfig | null {
    const configStr = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    return configStr ? JSON.parse(configStr) : null;
  }

  saveUISettings(settings: Record<string, any>): void {
    localStorage.setItem(STORAGE_KEYS.UI_SETTINGS, JSON.stringify(settings));
  }

  getUISettings(): Record<string, any> | null {
    const settingsStr = localStorage.getItem(STORAGE_KEYS.UI_SETTINGS);
    return settingsStr ? JSON.parse(settingsStr) : null;
  }

  // データクリア
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    const storeNames = [STORES.EXAMS, STORES.QUESTIONS, STORES.ANSWERS, STORES.GRADING_RESULTS];

    for (const storeName of storeNames) {
      await this.performDBOperation(storeName, store => store.clear());
    }
  }

  clearLocalStorage(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // データベース接続確認
  isConnected(): boolean {
    return this.db !== null;
  }

  // データベースクローズ
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// シングルトンインスタンス
export const dataService = new DataService();