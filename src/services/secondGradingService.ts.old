import type {
  GradingResult,
  SecondGrade,
  Answer,
  Question,
  GradeScore
} from '../contexts/SimpleAppContext';
import { dataService } from './dataService';

export interface SecondGradingRequest {
  gradingResultId: string;
  score: GradeScore;
  points: number;
  reason: string;
  changes: string;
  graderId: string;
}

export interface SecondGradingStats {
  total: number;
  completed: number;
  pending: number;
  agreementRate: number; // 一次採点との一致率
  changesByScore: {
    upgraded: number;    // ×→△, △→○
    downgraded: number; // ○→△, △→×
    unchanged: number;  // スコア変更なし
  };
  pointsAdjustment: {
    increased: number;
    decreased: number;
    unchanged: number;
    averageChange: number;
  };
}

export interface GradingComparisonItem {
  gradingResult: GradingResult;
  answer: Answer;
  question: Question;
  scoreChanged: boolean;
  pointsChanged: boolean;
  scoreDirection: 'upgraded' | 'downgraded' | 'unchanged';
  pointsDifference: number;
}

export class SecondGradingService {
  // 二次採点実行
  async performSecondGrading(request: SecondGradingRequest): Promise<GradingResult> {
    // 既存の採点結果取得
    const gradingResult = await dataService.getGradingResult(request.gradingResultId);
    if (!gradingResult) {
      throw new Error('採点結果が見つかりません');
    }

    // 最大点数チェック
    const answer = await dataService.getAnswer(gradingResult.answerId);
    if (!answer) {
      throw new Error('回答が見つかりません');
    }

    const question = await dataService.getQuestion(answer.questionId);
    if (!question) {
      throw new Error('問題が見つかりません');
    }

    if (request.points < 0 || request.points > question.maxScore) {
      throw new Error(`点数は0から${question.maxScore}の範囲で入力してください`);
    }

    // 二次採点結果作成
    const secondGrade: SecondGrade = {
      score: request.score,
      points: request.points,
      reason: request.reason,
      gradedAt: new Date(),
      graderId: request.graderId,
      changes: request.changes,
    };

    // 採点結果更新
    const updatedResult: GradingResult = {
      ...gradingResult,
      secondGrade,
    };

    await dataService.saveGradingResult(updatedResult);
    return updatedResult;
  }

  // 一次採点結果一覧取得（二次採点用）
  async getFirstGradingResults(examId: string): Promise<GradingComparisonItem[]> {
    const answers = await dataService.getAnswersByExamId(examId);
    const allResults = await dataService.getAllGradingResults();
    const exam = await dataService.getExam(examId);

    if (!exam) {
      throw new Error('試験データが見つかりません');
    }

    const items: GradingComparisonItem[] = [];

    for (const answer of answers) {
      const gradingResult = allResults.find(r => r.answerId === answer.id);
      if (!gradingResult) continue;

      const question = exam.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const scoreChanged = gradingResult.secondGrade
        ? gradingResult.firstGrade.score !== gradingResult.secondGrade.score
        : false;

      const pointsChanged = gradingResult.secondGrade
        ? gradingResult.firstGrade.points !== gradingResult.secondGrade.points
        : false;

      const scoreDirection = this.getScoreDirection(
        gradingResult.firstGrade.score,
        gradingResult.secondGrade?.score
      );

      const pointsDifference = gradingResult.secondGrade
        ? gradingResult.secondGrade.points - gradingResult.firstGrade.points
        : 0;

      items.push({
        gradingResult,
        answer,
        question,
        scoreChanged,
        pointsChanged,
        scoreDirection,
        pointsDifference,
      });
    }

    return items;
  }

  // スコア変化方向判定
  private getScoreDirection(
    firstScore: GradeScore,
    secondScore?: GradeScore
  ): 'upgraded' | 'downgraded' | 'unchanged' {
    if (!secondScore) return 'unchanged';

    const scoreValues = { '×': 0, '△': 1, '○': 2 };
    const firstValue = scoreValues[firstScore];
    const secondValue = scoreValues[secondScore];

    if (secondValue > firstValue) return 'upgraded';
    if (secondValue < firstValue) return 'downgraded';
    return 'unchanged';
  }

  // 二次採点統計取得
  async getSecondGradingStats(examId: string): Promise<SecondGradingStats> {
    const items = await this.getFirstGradingResults(examId);

    const total = items.length;
    const completed = items.filter(item => item.gradingResult.secondGrade).length;
    const pending = total - completed;

    // 一致率計算
    const agreementCount = items.filter(item => {
      if (!item.gradingResult.secondGrade) return false;
      return item.gradingResult.firstGrade.score === item.gradingResult.secondGrade.score;
    }).length;

    const agreementRate = completed > 0 ? (agreementCount / completed) * 100 : 0;

    // 変更統計
    const changesByScore = {
      upgraded: items.filter(item => item.scoreDirection === 'upgraded').length,
      downgraded: items.filter(item => item.scoreDirection === 'downgraded').length,
      unchanged: items.filter(item => item.scoreDirection === 'unchanged').length,
    };

    // 点数調整統計
    const pointsAdjustment = {
      increased: items.filter(item => item.pointsDifference > 0).length,
      decreased: items.filter(item => item.pointsDifference < 0).length,
      unchanged: items.filter(item => item.pointsDifference === 0).length,
      averageChange: completed > 0
        ? items.reduce((sum, item) => sum + item.pointsDifference, 0) / completed
        : 0,
    };

    return {
      total,
      completed,
      pending,
      agreementRate,
      changesByScore,
      pointsAdjustment,
    };
  }

  // 採点者別統計
  async getGraderStats(examId: string): Promise<Array<{
    graderId: string;
    firstGradingCount: number;
    secondGradingCount: number;
    averageScore: number;
    scoreDistribution: { [key in GradeScore]: number };
  }>> {
    const items = await this.getFirstGradingResults(examId);
    const graderMap = new Map<string, {
      firstGradingCount: number;
      secondGradingCount: number;
      totalPoints: number;
      maxPoints: number;
      scores: GradeScore[];
    }>();

    // 一次採点者（LLM）の統計
    items.forEach(item => {
      const graderId = item.gradingResult.firstGrade.graderId;
      const stats = graderMap.get(graderId) || {
        firstGradingCount: 0,
        secondGradingCount: 0,
        totalPoints: 0,
        maxPoints: 0,
        scores: [],
      };

      stats.firstGradingCount++;
      stats.totalPoints += item.gradingResult.firstGrade.points;
      stats.maxPoints += item.question.maxScore;
      stats.scores.push(item.gradingResult.firstGrade.score);

      graderMap.set(graderId, stats);
    });

    // 二次採点者の統計
    items
      .filter(item => item.gradingResult.secondGrade)
      .forEach(item => {
        const graderId = item.gradingResult.secondGrade!.graderId;
        const stats = graderMap.get(graderId) || {
          firstGradingCount: 0,
          secondGradingCount: 0,
          totalPoints: 0,
          maxPoints: 0,
          scores: [],
        };

        stats.secondGradingCount++;
        stats.totalPoints += item.gradingResult.secondGrade!.points;
        stats.maxPoints += item.question.maxScore;
        stats.scores.push(item.gradingResult.secondGrade!.score);

        graderMap.set(graderId, stats);
      });

    // 結果変換
    return Array.from(graderMap.entries()).map(([graderId, stats]) => {
      const scoreDistribution: { [key in GradeScore]: number } = { '○': 0, '△': 0, '×': 0 };
      stats.scores.forEach(score => {
        scoreDistribution[score]++;
      });

      return {
        graderId,
        firstGradingCount: stats.firstGradingCount,
        secondGradingCount: stats.secondGradingCount,
        averageScore: stats.maxPoints > 0 ? (stats.totalPoints / stats.maxPoints) * 100 : 0,
        scoreDistribution,
      };
    });
  }

  // 問題別の採点傾向分析
  async getQuestionGradingTrends(examId: string): Promise<Array<{
    questionId: string;
    questionNumber: string;
    title: string;
    totalAnswers: number;
    firstGradingAvg: number;
    secondGradingAvg?: number;
    scoreChangeRate: number;
    commonIssues: string[];
  }>> {
    const items = await this.getFirstGradingResults(examId);
    const questionMap = new Map<string, {
      question: Question;
      items: GradingComparisonItem[];
    }>();

    // 問題別にグループ化
    items.forEach(item => {
      const questionId = item.question.id;
      const group = questionMap.get(questionId) || {
        question: item.question,
        items: [],
      };
      group.items.push(item);
      questionMap.set(questionId, group);
    });

    // 統計計算
    return Array.from(questionMap.values()).map(group => {
      const { question, items } = group;
      const totalAnswers = items.length;

      // 一次採点平均
      const firstGradingTotal = items.reduce((sum, item) =>
        sum + item.gradingResult.firstGrade.points, 0
      );
      const firstGradingAvg = totalAnswers > 0 ? firstGradingTotal / totalAnswers : 0;

      // 二次採点平均
      const secondGradedItems = items.filter(item => item.gradingResult.secondGrade);
      const secondGradingAvg = secondGradedItems.length > 0
        ? secondGradedItems.reduce((sum, item) =>
          sum + item.gradingResult.secondGrade!.points, 0
        ) / secondGradedItems.length
        : undefined;

      // スコア変更率
      const scoreChangedCount = items.filter(item => item.scoreChanged).length;
      const scoreChangeRate = totalAnswers > 0 ? (scoreChangedCount / totalAnswers) * 100 : 0;

      // よくある問題点抽出
      const reasonsMap = new Map<string, number>();
      secondGradedItems.forEach(item => {
        const reason = item.gradingResult.secondGrade!.reason;
        const count = reasonsMap.get(reason) || 0;
        reasonsMap.set(reason, count + 1);
      });

      const commonIssues = Array.from(reasonsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason]) => reason);

      return {
        questionId: question.id,
        questionNumber: question.number,
        title: question.title,
        totalAnswers,
        firstGradingAvg,
        secondGradingAvg,
        scoreChangeRate,
        commonIssues,
      };
    });
  }

  // 二次採点の品質チェック
  async performQualityCheck(examId: string): Promise<{
    issues: Array<{
      type: 'score_mismatch' | 'extreme_change' | 'inconsistent_reasoning';
      gradingResultId: string;
      studentId: string;
      questionNumber: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    recommendations: string[];
  }> {
    const items = await this.getFirstGradingResults(examId);
    const issues: Array<{
      type: 'score_mismatch' | 'extreme_change' | 'inconsistent_reasoning';
      gradingResultId: string;
      studentId: string;
      questionNumber: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    items.forEach(item => {
      if (!item.gradingResult.secondGrade) return;

      const { firstGrade, secondGrade } = item.gradingResult;
      const { answer, question } = item;

      // スコアと点数の不整合チェック
      const pointPercentage = (secondGrade.points / question.maxScore) * 100;

      if (
        (secondGrade.score === '○' && pointPercentage < 80) ||
        (secondGrade.score === '△' && (pointPercentage < 50 || pointPercentage >= 80)) ||
        (secondGrade.score === '×' && pointPercentage >= 50)
      ) {
        issues.push({
          type: 'score_mismatch',
          gradingResultId: item.gradingResult.id,
          studentId: answer.studentId,
          questionNumber: question.number,
          description: `スコア「${secondGrade.score}」と点数「${secondGrade.points}/${question.maxScore}」が不整合です`,
          severity: 'high',
        });
      }

      // 極端な変更チェック
      const pointsDiff = Math.abs(secondGrade.points - firstGrade.points);
      const diffPercentage = (pointsDiff / question.maxScore) * 100;

      if (diffPercentage > 50) {
        issues.push({
          type: 'extreme_change',
          gradingResultId: item.gradingResult.id,
          studentId: answer.studentId,
          questionNumber: question.number,
          description: `一次採点から${pointsDiff}点の大幅な変更があります`,
          severity: diffPercentage > 75 ? 'high' : 'medium',
        });
      }

      // 理由の一貫性チェック（簡易版）
      if (
        secondGrade.reason.length < 10 ||
        secondGrade.changes.length < 10
      ) {
        issues.push({
          type: 'inconsistent_reasoning',
          gradingResultId: item.gradingResult.id,
          studentId: answer.studentId,
          questionNumber: question.number,
          description: '採点理由または変更理由が不十分です',
          severity: 'low',
        });
      }
    });

    // 推奨事項生成
    const recommendations: string[] = [];
    const highSeverityCount = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length;

    if (highSeverityCount > 0) {
      recommendations.push('重要度「高」の問題を優先的に確認してください');
    }

    if (mediumSeverityCount > items.length * 0.1) {
      recommendations.push('大幅な点数変更が多い傾向があります。採点基準を再確認してください');
    }

    const scoreChangedRate = (items.filter(i => i.scoreChanged).length / items.length) * 100;
    if (scoreChangedRate > 30) {
      recommendations.push('スコア変更率が高いです。一次採点の精度向上を検討してください');
    }

    return {
      issues,
      recommendations,
    };
  }

  // 採点結果の最終確定
  async finalizeGrading(examId: string, graderId: string): Promise<{
    finalized: number;
    errors: string[];
  }> {
    const items = await this.getFirstGradingResults(examId);
    const errors: string[] = [];
    let finalized = 0;

    for (const item of items) {
      try {
        // 二次採点がない場合は一次採点を確定とする
        if (!item.gradingResult.secondGrade) {
          const secondGrade: SecondGrade = {
            ...item.gradingResult.firstGrade,
            graderId: `${graderId}_auto_finalized`,
            changes: '二次採点なし（一次採点結果を確定）',
            gradedAt: new Date(),
          };

          const updatedResult: GradingResult = {
            ...item.gradingResult,
            secondGrade,
          };

          await dataService.saveGradingResult(updatedResult);
          finalized++;
        }
      } catch (error) {
        errors.push(
          `学生${item.answer.studentId}の問題${item.question.number}の確定に失敗: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
      }
    }

    return {
      finalized,
      errors,
    };
  }
}