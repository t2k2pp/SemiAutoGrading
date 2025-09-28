import type {
  Exam,
  Answer,
  GradingResult,
  Question,
  GradeScore
} from '../contexts/SimpleAppContext';
import { dataService } from './dataService';

export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeAnswerContent?: boolean;
  includeFirstGrading?: boolean;
  includeSecondGrading?: boolean;
  includeStatistics?: boolean;
  filename?: string;
}

export interface ExportData {
  exam: Exam;
  answers: Answer[];
  gradingResults: GradingResult[];
  questions: Question[];
  statistics: {
    totalAnswers: number;
    gradedAnswers: number;
    averageScore: number;
    scoreDistribution: Record<GradeScore, number>;
  };
}

export interface ExportResult {
  success: boolean;
  filename: string;
  content?: string;
  blob?: Blob;
  error?: string;
}

export class ExportService {
  // メインエクスポート関数
  async exportGradingResults(
    examId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // データ取得
      const exportData = await this.prepareExportDataOld(examId);

      // フォーマット別エクスポート
      switch (options.format) {
        case 'csv':
          return this.exportToCSV(exportData, options);
        case 'json':
          return this.exportToJSON(exportData, options);
        case 'excel':
          return this.exportToExcel(exportData, options);
        case 'pdf':
          return this.exportToPDF(exportData, options);
        default:
          throw new Error(`サポートされていないフォーマット: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  // エクスポート用データ準備
  private async prepareExportDataOld(examId: string): Promise<ExportData> {
    const exam = await dataService.getExam(examId);
    if (!exam) {
      throw new Error('試験データが見つかりません');
    }

    const answers = await dataService.getAnswersByExamId(examId);
    const allResults = await dataService.getAllGradingResults();
    const gradingResults = allResults.filter(result =>
      answers.some(answer => answer.id === result.answerId)
    );

    // 結果データ作成
    const results = answers.map(answer => {
      const gradingResult = gradingResults.find(gr => gr.answerId === answer.id);
      const question = exam.questions.find(q => q.id === answer.questionId);

      if (!gradingResult || !question) {
        return null;
      }

      // 最終スコア決定（二次採点があれば二次、なければ一次）
      const finalGrade = gradingResult.secondGrade || gradingResult.firstGrade;

      return {
        studentId: answer.studentId,
        questionId: answer.questionId,
        answer: answer.content,
        firstGrade: gradingResult.firstGrade,
        secondGrade: gradingResult.secondGrade,
        finalScore: finalGrade.score,
        finalPoints: finalGrade.points,
      };
    }).filter(result => result !== null);

    // 統計計算
    const totalStudents = new Set(results.map(r => r.studentId)).size;
    const totalQuestions = exam.questions.length;
    const totalPossiblePoints = results.reduce((sum, result) => {
      const question = exam.questions.find(q => q.id === result.questionId);
      return sum + (question?.maxScore || 0);
    }, 0);
    const totalActualPoints = results.reduce((sum, result) => sum + result.finalPoints, 0);
    const averageScore = totalPossiblePoints > 0 ? (totalActualPoints / totalPossiblePoints) * 100 : 0;

    const gradeDistribution: { [key in GradeScore]: number } = { '○': 0, '△': 0, '×': 0 };
    results.forEach(result => {
      gradeDistribution[result.finalScore]++;
    });

    const scoreDistribution = results.reduce((acc, result) => {
      acc[result.finalScore] = (acc[result.finalScore] || 0) + 1;
      return acc;
    }, {} as Record<GradeScore, number>);

    return {
      exam,
      answers,
      gradingResults,
      questions: exam.questions,
      statistics: {
        totalAnswers: answers.length,
        gradedAnswers: gradingResults.length,
        averageScore,
        scoreDistribution
      }
    };
  }

  // CSV形式エクスポート
  private async exportToCSV(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    const headers = [
      'student_id',
      'question_id',
      'question_number',
      'question_title',
      'max_score',
    ];

    if (options.includeAnswerContent) {
      headers.push('answer_content');
    }

    if (options.includeFirstGrading) {
      headers.push(
        'first_score',
        'first_points',
        'first_reason',
        'first_grader_id',
        'first_graded_at'
      );
    }

    if (options.includeSecondGrading) {
      headers.push(
        'second_score',
        'second_points',
        'second_reason',
        'second_grader_id',
        'second_graded_at',
        'second_changes'
      );
    }

    headers.push('final_score', 'final_points');

    const rows = [headers.join(',')];

    data.gradingResults.forEach(result => {
      const answer = data.answers.find(a => a.id === result.answerId);
      const question = data.questions.find(q => q.id === answer?.questionId);
      if (!question || !answer) return;

      const finalGrade = result.secondGrade || result.firstGrade;

      const row = [
        this.escapeCSVField(answer.studentId),
        this.escapeCSVField(question.id),
        this.escapeCSVField(question.number),
        this.escapeCSVField(question.title),
        question.maxScore.toString(),
      ];

      if (options.includeAnswerContent) {
        row.push(this.escapeCSVField(answer.content));
      }

      if (options.includeFirstGrading) {
        row.push(
          this.escapeCSVField(result.firstGrade.score),
          result.firstGrade.points.toString(),
          this.escapeCSVField(result.firstGrade.reason),
          this.escapeCSVField(result.firstGrade.graderId),
          result.firstGrade.gradedAt.toISOString()
        );
      }

      if (options.includeSecondGrading) {
        const secondGrade = result.secondGrade;
        row.push(
          secondGrade ? this.escapeCSVField(secondGrade.score) : '',
          secondGrade ? secondGrade.points.toString() : '',
          secondGrade ? this.escapeCSVField(secondGrade.reason) : '',
          secondGrade ? this.escapeCSVField(secondGrade.graderId) : '',
          secondGrade ? secondGrade.gradedAt.toISOString() : '',
          secondGrade ? this.escapeCSVField(secondGrade.changes) : ''
        );
      }

      row.push(
        this.escapeCSVField(finalGrade.score),
        finalGrade.points.toString()
      );

      rows.push(row.join(','));
    });

    // 統計情報追加
    if (options.includeStatistics) {
      rows.push(''); // 空行
      rows.push('=== 統計情報 ===');
      const uniqueStudents = new Set(data.answers.map(a => a.studentId)).size;
      rows.push(`総学生数,${uniqueStudents}`);
      rows.push(`総問題数,${data.exam.questions.length}`);
      rows.push(`平均得点率,${data.statistics.averageScore.toFixed(2)}%`);
      rows.push(`○の数,${data.statistics.scoreDistribution['○'] || 0}`);
      rows.push(`△の数,${data.statistics.scoreDistribution['△'] || 0}`);
      rows.push(`×の数,${data.statistics.scoreDistribution['×'] || 0}`);
    }

    const content = rows.join('\n');
    const filename = options.filename || this.generateFilename(data.exam.name, 'csv');

    return {
      success: true,
      filename,
      content,
      blob: new Blob([content], { type: 'text/csv;charset=utf-8' }),
    };
  }

  // JSON形式エクスポート
  private async exportToJSON(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportObj: any = {
      exam: {
        id: data.exam.id,
        name: data.exam.name,
        description: data.exam.description,
        questions: data.exam.questions.map(q => ({
          id: q.id,
          number: q.number,
          title: q.title,
          maxScore: q.maxScore,
          ...(options.includeAnswerContent && {
            content: q.content,
            intention: q.intention,
            sampleAnswer: q.sampleAnswer,
          }),
        })),
      },
      results: data.gradingResults.map(result => {
        const answer = data.answers.find(a => a.id === result.answerId);
        const question = data.questions.find(q => q.id === answer?.questionId);
        const finalGrade = result.secondGrade || result.firstGrade;

        const resultObj: any = {
          studentId: answer?.studentId,
          questionId: question?.id,
          finalScore: finalGrade.score,
          finalPoints: finalGrade.points,
        };

        if (options.includeAnswerContent) {
          resultObj.answer = answer?.content;
        }

        if (options.includeFirstGrading) {
          resultObj.firstGrade = result.firstGrade;
        }

        if (options.includeSecondGrading && result.secondGrade) {
          resultObj.secondGrade = result.secondGrade;
        }

        return resultObj;
      }),
    };

    if (options.includeStatistics) {
      exportObj.statistics = data.statistics;
    }

    const content = JSON.stringify(exportObj, null, 2);
    const filename = options.filename || this.generateFilename(data.exam.name, 'json');

    return {
      success: true,
      filename,
      content,
      blob: new Blob([content], { type: 'application/json;charset=utf-8' }),
    };
  }

  // Excel形式エクスポート（簡易版：CSVと同様）
  private async exportToExcel(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Excel形式は複雑なので、ここでは簡易版としてCSVと同じ内容をTSV形式で出力
    const csvResult = await this.exportToCSV(data, options);

    if (!csvResult.success || !csvResult.content) {
      return csvResult;
    }

    // カンマをタブに置換してTSV形式に
    const tsvContent = csvResult.content.replace(/,/g, '\t');
    const filename = options.filename || this.generateFilename(data.exam.name, 'xlsx');

    return {
      success: true,
      filename,
      content: tsvContent,
      blob: new Blob([tsvContent], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
    };
  }

  // PDF形式エクスポート（簡易版：HTML文字列）
  private async exportToPDF(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    const html = this.generateHTMLReport(data, options);
    const filename = options.filename || this.generateFilename(data.exam.name, 'html');

    return {
      success: true,
      filename,
      content: html,
      blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
    };
  }

  // HTML形式レポート生成
  private generateHTMLReport(data: ExportData, options: ExportOptions): string {
    const { exam, gradingResults, statistics } = data;

    let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exam.name} - 採点結果</title>
    <style>
        body { font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .score-o { color: #28a745; font-weight: bold; }
        .score-triangle { color: #ffc107; font-weight: bold; }
        .score-x { color: #dc3545; font-weight: bold; }
        .print-date { font-size: 12px; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${exam.name} - 採点結果レポート</h1>
        <p>${exam.description}</p>
    </div>
`;

    if (options.includeStatistics) {
      html += `
    <div class="summary">
        <h2>統計情報</h2>
        <p><strong>総学生数:</strong> ${new Set(data.answers.map(a => a.studentId)).size}名</p>
        <p><strong>総問題数:</strong> ${data.exam.questions.length}問</p>
        <p><strong>平均得点率:</strong> ${data.statistics.averageScore.toFixed(2)}%</p>
        <p><strong>評価分布:</strong>
           ○ ${data.statistics.scoreDistribution['○'] || 0}件,
           △ ${data.statistics.scoreDistribution['△'] || 0}件,
           × ${data.statistics.scoreDistribution['×'] || 0}件
        </p>
    </div>
`;
    }

    html += `
    <h2>採点結果詳細</h2>
    <table>
        <thead>
            <tr>
                <th>学生ID</th>
                <th>問題</th>
                <th>最終評価</th>
                <th>最終点数</th>
`;

    if (options.includeFirstGrading) {
      html += `
                <th>一次評価</th>
                <th>一次点数</th>
                <th>一次理由</th>
`;
    }

    if (options.includeSecondGrading) {
      html += `
                <th>二次評価</th>
                <th>二次点数</th>
                <th>二次理由</th>
`;
    }

    html += `
            </tr>
        </thead>
        <tbody>
`;

    gradingResults.forEach(result => {
      const answer = data.answers.find(a => a.id === result.answerId);
      const question = exam.questions.find(q => q.id === answer?.questionId);
      if (!question || !answer) return;

      const finalGrade = result.secondGrade || result.firstGrade;
      const scoreClass = finalGrade.score === '○' ? 'score-o'
                       : finalGrade.score === '△' ? 'score-triangle'
                       : 'score-x';

      html += `
            <tr>
                <td>${answer.studentId}</td>
                <td>${question.number}: ${question.title}</td>
                <td class="${scoreClass}">${finalGrade.score}</td>
                <td>${finalGrade.points}/${question.maxScore}</td>
`;

      if (options.includeFirstGrading) {
        const firstScoreClass = result.firstGrade.score === '○' ? 'score-o'
                              : result.firstGrade.score === '△' ? 'score-triangle'
                              : 'score-x';
        html += `
                <td class="${firstScoreClass}">${result.firstGrade.score}</td>
                <td>${result.firstGrade.points}</td>
                <td>${result.firstGrade.reason}</td>
`;
      }

      if (options.includeSecondGrading) {
        if (result.secondGrade) {
          const secondScoreClass = result.secondGrade.score === '○' ? 'score-o'
                                  : result.secondGrade.score === '△' ? 'score-triangle'
                                  : 'score-x';
          html += `
                <td class="${secondScoreClass}">${result.secondGrade.score}</td>
                <td>${result.secondGrade.points}</td>
                <td>${result.secondGrade.reason}</td>
`;
        } else {
          html += `
                <td>-</td>
                <td>-</td>
                <td>-</td>
`;
        }
      }

      html += `
            </tr>
`;
    });

    html += `
        </tbody>
    </table>

    <div class="print-date">
        レポート生成日時: ${new Date().toLocaleString('ja-JP')}
    </div>
</body>
</html>
`;

    return html;
  }

  // CSVフィールドエスケープ
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  // ファイル名生成
  private generateFilename(examName: string, extension: string): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = examName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '_');
    return `${safeName}_採点結果_${timestamp}.${extension}`;
  }

  // ファイルダウンロード
  downloadFile(result: ExportResult): void {
    if (!result.success || !result.blob) {
      throw new Error('ダウンロード可能なファイルがありません');
    }

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // バックアップ用全データエクスポート
  async exportBackup(examId?: string): Promise<ExportResult> {
    try {
      const allExams = examId
        ? [await dataService.getExam(examId)].filter(Boolean)
        : await dataService.getAllExams();

      const allAnswers = examId
        ? await dataService.getAnswersByExamId(examId)
        : [];

      const allResults = await dataService.getAllGradingResults();

      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exams: allExams,
        answers: allAnswers,
        gradingResults: allResults,
      };

      const content = JSON.stringify(backupData, null, 2);
      const filename = `ipa-grader-backup-${new Date().toISOString().slice(0, 10)}.json`;

      return {
        success: true,
        filename,
        content,
        blob: new Blob([content], { type: 'application/json;charset=utf-8' }),
      };
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  // 簡易エクスポート関数群（UIで使用）
  async exportToCsv(
    gradingResults: GradingResult[],
    answers: Answer[],
    exam: Exam
  ): Promise<Blob> {
    const exportData = await this.buildExportData(gradingResults, answers, exam);
    const result = await this.exportToCSV(exportData, { format: 'csv' });
    if (!result.blob) {
      throw new Error('CSV出力に失敗しました');
    }
    return result.blob;
  }

  async exportToJson(
    gradingResults: GradingResult[],
    answers: Answer[],
    exam: Exam
  ): Promise<Blob> {
    const exportData = await this.buildExportData(gradingResults, answers, exam);
    const result = await this.exportToJSON(exportData, { format: 'json' });
    if (!result.blob) {
      throw new Error('JSON出力に失敗しました');
    }
    return result.blob;
  }

  async exportToHtml(
    gradingResults: GradingResult[],
    answers: Answer[],
    exam: Exam
  ): Promise<Blob> {
    const exportData = await this.buildExportData(gradingResults, answers, exam);
    const html = this.generateHTMLReport(exportData, {
      includeStatistics: true,
      includeQuestions: true,
      includeAnswers: true
    });
    return new Blob([html], { type: 'text/html' });
  }

  private async buildExportData(
    gradingResults: GradingResult[],
    answers: Answer[],
    exam: Exam
  ): Promise<ExportData> {
    const scoreDistribution = gradingResults.reduce((acc, result) => {
      const finalGrade = result.secondGrade || result.firstGrade;
      acc[finalGrade.score] = (acc[finalGrade.score] || 0) + 1;
      return acc;
    }, {} as Record<GradeScore, number>);

    const totalScore = gradingResults.reduce((sum, result) => {
      const finalGrade = result.secondGrade || result.firstGrade;
      return sum + finalGrade.points;
    }, 0);

    return {
      exam,
      answers,
      gradingResults,
      questions: exam.questions,
      statistics: {
        totalAnswers: answers.length,
        gradedAnswers: gradingResults.length,
        averageScore: gradingResults.length > 0 ? totalScore / gradingResults.length : 0,
        scoreDistribution
      }
    };
  }

}

export const exportService = new ExportService();