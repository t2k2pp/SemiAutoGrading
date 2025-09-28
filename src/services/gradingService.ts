import type {
  Answer,
  Question,
  GradingResult,
  FirstGrade,
  LLMConfig
} from '../contexts/SimpleAppContext';
import { llmService } from './llmService';
import { dataService } from './dataService';

interface LLMGradingResponse {
  score: '○' | '△' | '×';
  points: number;
  reason: string;
  confidence: number;
}

export interface GradingProgress {
  current: number;
  total: number;
  percentage: number;
  currentAnswer?: {
    studentId: string;
    questionId: string;
  };
  eta?: number; // 推定残り時間（秒）
}

export interface GradingSession {
  id: string;
  examId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: GradingProgress;
  results: GradingResult[];
  errors: string[];
  config: LLMConfig;
}

export interface FirstGradingOptions {
  skipExistingResults?: boolean; // 既存の採点結果をスキップ
  consistencyCheck?: boolean;    // 一貫性チェックを実行
  batchSize?: number;            // バッチサイズ
  delayBetweenRequests?: number; // リクエスト間の遅延（ms）
}

export class GradingService {
  private activeSessions: Map<string, GradingSession> = new Map();

  constructor() {
    // llmServiceは個別にインポートして使用
  }

  // LLM設定更新
  updateLLMConfig(config: LLMConfig): void {
    llmService.updateConfig(config);
  }

  // LLM接続テスト
  async testLLMConnection(): Promise<boolean> {
    return await llmService.testConnection();
  }

  // 一次採点セッション開始
  async startFirstGrading(
    examId: string,
    options: FirstGradingOptions = {}
  ): Promise<string> {
    // 試験データ取得
    const exam = await dataService.getExam(examId);
    if (!exam) {
      throw new Error('試験データが見つかりません');
    }

    // 回答データ取得
    const answers = await dataService.getAnswersByExamId(examId);
    if (answers.length === 0) {
      throw new Error('採点対象の回答がありません');
    }

    // 既存の採点結果確認
    let answersToGrade = answers;
    if (options.skipExistingResults) {
      const existingResults = await dataService.getAllGradingResults();
      const existingAnswerIds = new Set(existingResults.map(r => r.answerId));
      answersToGrade = answers.filter(a => !existingAnswerIds.has(a.id));
    }

    if (answersToGrade.length === 0) {
      throw new Error('採点対象の回答がありません（既存結果をスキップ）');
    }

    // セッション作成
    const sessionId = this.generateSessionId();
    const session: GradingSession = {
      id: sessionId,
      examId,
      startedAt: new Date(),
      status: 'running',
      progress: {
        current: 0,
        total: answersToGrade.length,
        percentage: 0,
      },
      results: [],
      errors: [],
      config: this.llmService['config'], // プライベートプロパティへのアクセス
    };

    this.activeSessions.set(sessionId, session);

    // 非同期で採点実行
    this.executeFirstGrading(sessionId, exam.questions, answersToGrade, options)
      .catch(error => {
        session.status = 'failed';
        session.errors.push(error.message);
        console.error('一次採点でエラーが発生:', error);
      });

    return sessionId;
  }

  // 一次採点実行（内部メソッド）
  private async executeFirstGrading(
    sessionId: string,
    questions: Question[],
    answers: Answer[],
    options: FirstGradingOptions
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const questionMap = new Map(questions.map(q => [q.id, q]));
    const startTime = Date.now();

    try {
      for (let i = 0; i < answers.length; i++) {
        // キャンセルチェック
        if (session.status === 'cancelled') {
          return;
        }

        const answer = answers[i];
        const question = questionMap.get(answer.questionId);

        if (!question) {
          session.errors.push(
            `問題が見つかりません: ${answer.questionId} (学生: ${answer.studentId})`
          );
          continue;
        }

        // プログレス更新
        session.progress.current = i;
        session.progress.percentage = Math.round((i / answers.length) * 100);
        session.progress.currentAnswer = {
          studentId: answer.studentId,
          questionId: answer.questionId,
        };

        // ETA計算
        if (i > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTimePerAnswer = elapsed / i;
          session.progress.eta = Math.round(avgTimePerAnswer * (answers.length - i));
        }

        try {
          // LLM採点実行
          let gradingResponse: LLMGradingResponse;

          if (options.consistencyCheck) {
            // 一貫性チェック付き採点
            const consistencyResult = await this.llmService.checkConsistency(
              question,
              answer,
              3
            );

            if (!consistencyResult.isConsistent) {
              session.errors.push(
                `採点の一貫性に問題があります (学生: ${answer.studentId}, 問題: ${question.number})`
              );
            }

            // 最も頻出するスコアを採用
            gradingResponse = this.selectMostFrequentResult(consistencyResult.results);
          } else {
            gradingResponse = await this.llmService.gradeAnswer(question, answer);
          }

          // 採点結果作成
          const firstGrade: FirstGrade = {
            score: gradingResponse.score,
            points: gradingResponse.points,
            reason: gradingResponse.reason,
            gradedAt: new Date(),
            graderId: `LLM_${this.llmService['config'].model}`,
          };

          const gradingResult: GradingResult = {
            id: this.generateGradingResultId(answer.id),
            answerId: answer.id,
            firstGrade,
          };

          // データベースに保存
          await dataService.saveGradingResult(gradingResult);
          session.results.push(gradingResult);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          session.errors.push(
            `採点に失敗 (学生: ${answer.studentId}, 問題: ${question.number}): ${errorMessage}`
          );
        }

        // リクエスト間隔調整
        if (i < answers.length - 1 && options.delayBetweenRequests) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenRequests));
        }
      }

      // 完了処理
      session.status = 'completed';
      session.completedAt = new Date();
      session.progress.current = answers.length;
      session.progress.percentage = 100;
      session.progress.eta = 0;

    } catch (error) {
      session.status = 'failed';
      session.errors.push(
        error instanceof Error ? error.message : '採点処理で不明なエラーが発生'
      );
    }
  }

  // 最頻出結果選択（一貫性チェック用）
  private selectMostFrequentResult(results: LLMGradingResponse[]): LLMGradingResponse {
    const scoreCounts = new Map<string, number>();

    results.forEach(result => {
      const count = scoreCounts.get(result.score) || 0;
      scoreCounts.set(result.score, count + 1);
    });

    // 最も多いスコアを取得
    let mostFrequentScore = results[0].score;
    let maxCount = 0;

    for (const [score, count] of scoreCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentScore = score as '○' | '△' | '×';
      }
    }

    // 最頻出スコアの結果から1つを選択
    return results.find(r => r.score === mostFrequentScore) || results[0];
  }

  // セッション状態取得
  getSession(sessionId: string): GradingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // セッション一覧取得
  getAllSessions(): GradingSession[] {
    return Array.from(this.activeSessions.values());
  }

  // セッションキャンセル
  cancelSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'running') {
      session.status = 'cancelled';
      return true;
    }
    return false;
  }

  // セッション削除
  removeSession(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }

  // 採点統計取得
  async getGradingStatistics(examId: string): Promise<{
    total: number;
    graded: number;
    pending: number;
    scoreDistribution: {
      [key in '○' | '△' | '×']: number;
    };
    averageScore: number;
    questionsStats: Array<{
      questionId: string;
      questionNumber: string;
      total: number;
      graded: number;
      averageScore: number;
    }>;
  }> {
    const answers = await dataService.getAnswersByExamId(examId);
    const allResults = await dataService.getAllGradingResults();
    const results = allResults.filter(r =>
      answers.some(a => a.id === r.answerId)
    );

    const exam = await dataService.getExam(examId);
    const questions = exam?.questions || [];

    // 全体統計
    const scoreDistribution = { '○': 0, '△': 0, '×': 0 };
    let totalPoints = 0;
    let maxPossiblePoints = 0;

    results.forEach(result => {
      const grade = result.secondGrade || result.firstGrade;
      scoreDistribution[grade.score]++;
      totalPoints += grade.points;

      const answer = answers.find(a => a.id === result.answerId);
      const question = questions.find(q => q.id === answer?.questionId);
      if (question) {
        maxPossiblePoints += question.maxScore;
      }
    });

    // 問題別統計
    const questionsStats = questions.map(question => {
      const questionAnswers = answers.filter(a => a.questionId === question.id);
      const questionResults = results.filter(r =>
        questionAnswers.some(a => a.id === r.answerId)
      );

      const questionTotalPoints = questionResults.reduce((sum, result) => {
        const grade = result.secondGrade || result.firstGrade;
        return sum + grade.points;
      }, 0);

      return {
        questionId: question.id,
        questionNumber: question.number,
        total: questionAnswers.length,
        graded: questionResults.length,
        averageScore: questionResults.length > 0
          ? questionTotalPoints / questionResults.length
          : 0,
      };
    });

    return {
      total: answers.length,
      graded: results.length,
      pending: answers.length - results.length,
      scoreDistribution,
      averageScore: results.length > 0 ? totalPoints / results.length : 0,
      questionsStats,
    };
  }

  // 単一回答の再採点
  async regradeAnswer(answerId: string): Promise<GradingResult> {
    const answer = await dataService.getAnswer(answerId);
    if (!answer) {
      throw new Error('回答が見つかりません');
    }

    const question = await dataService.getQuestion(answer.questionId);
    if (!question) {
      throw new Error('問題が見つかりません');
    }

    // LLM採点実行
    const gradingResponse = await this.llmService.gradeAnswer(question, answer);

    // 新しい一次採点結果作成
    const firstGrade: FirstGrade = {
      score: gradingResponse.score,
      points: gradingResponse.points,
      reason: gradingResponse.reason,
      gradedAt: new Date(),
      graderId: `LLM_${this.llmService['config'].model}_regrade`,
    };

    // 既存結果を取得・更新
    let gradingResult = await dataService.getGradingResultByAnswerId(answerId);

    if (gradingResult) {
      // 既存結果を更新（二次採点がある場合は保持）
      gradingResult.firstGrade = firstGrade;
    } else {
      // 新規結果作成
      gradingResult = {
        id: this.generateGradingResultId(answerId),
        answerId,
        firstGrade,
      };
    }

    await dataService.saveGradingResult(gradingResult);
    return gradingResult;
  }

  // ID生成
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGradingResultId(answerId: string): string {
    return `grading_${answerId}_${Date.now()}`;
  }

  // クリーンアップ（完了したセッションを削除）
  cleanup(): void {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.status === 'completed' || session.status === 'failed') {
        const daysSinceCompletion = session.completedAt
          ? (Date.now() - session.completedAt.getTime()) / (1000 * 60 * 60 * 24)
          : 0;

        // 1日経過したセッションは削除
        if (daysSinceCompletion > 1) {
          this.activeSessions.delete(sessionId);
        }
      }
    }
  }
}

export const gradingService = new GradingService();

// 単一の採点関数（UIで使用）
export async function gradeAnswer(
  answer: Answer,
  question: Question,
  llmConfig: LLMConfig
): Promise<GradingResult> {
  const grading = await llmService.gradeAnswer(answer, question);

  const firstGrade: FirstGrade = {
    score: grading.score,
    points: grading.points,
    reason: grading.reason,
    gradedAt: new Date(),
    graderId: 'ai'
  };

  const result: GradingResult = {
    id: `grade_${answer.id}_${Date.now()}`,
    answerId: answer.id,
    firstGrade
  };

  await dataService.saveGradingResult(result);
  return result;
}