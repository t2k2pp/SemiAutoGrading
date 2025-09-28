import type { Answer, Question } from '../contexts/SimpleAppContext';
import { dataService } from './dataService';

export interface CSVAnswerRow {
  student_id: string;
  question_number: string;
  answer_content: string;
}

export interface CSVParseResult {
  success: boolean;
  data: CSVAnswerRow[];
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    uniqueStudents: number;
    uniqueQuestions: number;
  };
}

export interface CSVImportResult {
  success: boolean;
  answers: Answer[];
  errors: string[];
  warnings: string[];
  summary: {
    imported: number;
    skipped: number;
    failed: number;
  };
}

export class CSVService {
  // CSV文字列をパース
  parseCSV(csvContent: string): CSVParseResult {
    const lines = csvContent.trim().split('\n');
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: CSVAnswerRow[] = [];

    if (lines.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['CSVファイルが空です'],
        warnings: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          uniqueStudents: 0,
          uniqueQuestions: 0,
        },
      };
    }

    // ヘッダー行チェック
    const headers = this.parseCSVLine(lines[0]);
    const expectedHeaders = ['student_id', 'question_number', 'answer_content'];

    if (!this.validateHeaders(headers, expectedHeaders)) {
      errors.push(
        `ヘッダーが不正です。期待値: [${expectedHeaders.join(', ')}], 実際: [${headers.join(', ')}]`
      );
    }

    // データ行をパース
    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i].trim();

      if (line === '') {
        warnings.push(`行 ${lineNumber}: 空行をスキップしました`);
        continue;
      }

      try {
        const fields = this.parseCSVLine(line);

        if (fields.length !== 3) {
          errors.push(`行 ${lineNumber}: フィールド数が不正です（期待値: 3, 実際: ${fields.length}）`);
          continue;
        }

        const [student_id, question_number, answer_content] = fields;

        // バリデーション
        const validationResult = this.validateCSVRow(
          { student_id, question_number, answer_content },
          lineNumber
        );

        if (validationResult.isValid) {
          data.push({ student_id, question_number, answer_content });
        } else {
          errors.push(...validationResult.errors);
        }

        warnings.push(...validationResult.warnings);
      } catch (error) {
        errors.push(`行 ${lineNumber}: パースエラー - ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }

    // 統計情報計算
    const uniqueStudents = new Set(data.map(row => row.student_id)).size;
    const uniqueQuestions = new Set(data.map(row => row.question_id)).size;

    return {
      success: errors.length === 0,
      data,
      errors,
      warnings,
      summary: {
        totalRows: lines.length - 1, // ヘッダー行を除く
        validRows: data.length,
        invalidRows: (lines.length - 1) - data.length,
        uniqueStudents,
        uniqueQuestions,
      },
    };
  }

  // CSV行をパース（カンマ区切り、クォート対応）
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteCount = 0;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        quoteCount++;
        if (inQuotes && line[i + 1] === '"') {
          // エスケープされたクォート
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // ヘッダー検証
  private validateHeaders(actual: string[], expected: string[]): boolean {
    if (actual.length !== expected.length) return false;

    return expected.every((header, index) =>
      actual[index].toLowerCase().trim() === header.toLowerCase()
    );
  }

  // CSV行データの検証
  private validateCSVRow(row: CSVAnswerRow, lineNumber: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 学生ID検証
    if (!row.student_id.trim()) {
      errors.push(`行 ${lineNumber}: 学生IDが空です`);
    } else if (!/^[a-zA-Z0-9_-]+$/.test(row.student_id)) {
      warnings.push(`行 ${lineNumber}: 学生ID「${row.student_id}」に特殊文字が含まれています`);
    }

    // 問題番号検証
    if (!row.question_number.trim()) {
      errors.push(`行 ${lineNumber}: 問題番号が空です`);
    }

    // 回答内容検証
    if (!row.answer_content.trim()) {
      errors.push(`行 ${lineNumber}: 回答内容が空です`);
    } else if (row.answer_content.length > 10000) {
      warnings.push(`行 ${lineNumber}: 回答内容が長すぎます（${row.answer_content.length}文字）`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ファイルからCSVを読み込み
  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error('ファイル読み込みに失敗しました'));
      };

      // 文字エンコーディング自動検出
      reader.readAsText(file, 'UTF-8');
    });
  }

  // CSVデータをAnswerエンティティに変換してインポート
  async importAnswers(
    csvData: CSVAnswerRow[],
    examId: string,
    questions: Question[]
  ): Promise<CSVImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const answers: Answer[] = [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // 問題IDマッピング作成
    const questionMap = new Map<string, Question>();
    questions.forEach(q => {
      questionMap.set(q.id, q);
      // 問題番号での検索も可能にする
      questionMap.set(q.number, q);
    });

    for (const [index, row] of csvData.entries()) {
      try {
        // 問題の存在確認
        const question = questionMap.get(row.question_number);
        if (!question) {
          errors.push(
            `行 ${index + 2}: 問題番号「${row.question_number}」に対応する問題が見つかりません`
          );
          failed++;
          continue;
        }

        // 既存回答の確認
        const existingAnswers = await dataService.getAnswersByExamId(examId);
        const isDuplicate = existingAnswers.some(
          a => a.studentId === row.student_id && a.questionId === question.id
        );

        if (isDuplicate) {
          warnings.push(
            `行 ${index + 2}: 学生「${row.student_id}」の問題「${row.question_number}」への回答は既に存在します`
          );
          skipped++;
          continue;
        }

        // Answerエンティティ作成
        const answer: Answer = {
          id: this.generateAnswerId(row.student_id, question.id),
          examId,
          studentId: row.student_id,
          questionId: question.id,
          content: row.answer_content.trim(),
          createdAt: new Date(),
        };

        // データベースに保存
        await dataService.saveAnswer(answer);
        answers.push(answer);
        imported++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        errors.push(`行 ${index + 2}: インポートに失敗 - ${errorMessage}`);
        failed++;
      }
    }

    return {
      success: failed === 0,
      answers,
      errors,
      warnings,
      summary: {
        imported,
        skipped,
        failed,
      },
    };
  }

  // 重複チェック
  async checkDuplicates(
    csvData: CSVAnswerRow[],
    examId: string
  ): Promise<{
    duplicates: Array<{
      studentId: string;
      questionId: string;
      lineNumber: number;
    }>;
    csvDuplicates: Array<{
      studentId: string;
      questionId: string;
      lineNumbers: number[];
    }>;
  }> {
    // 既存データとの重複チェック
    const existingAnswers = await dataService.getAnswersByExamId(examId);
    const existingSet = new Set(
      existingAnswers.map(a => `${a.studentId}:${a.questionId}`)
    );

    const duplicates = csvData
      .map((row, index) => ({
        studentId: row.student_id,
        questionId: row.question_number,
        lineNumber: index + 2, // ヘッダー行を考慮
      }))
      .filter(item => existingSet.has(`${item.studentId}:${item.questionId}`));

    // CSV内での重複チェック
    const csvMap = new Map<string, number[]>();
    csvData.forEach((row, index) => {
      const key = `${row.student_id}:${row.question_number}`;
      const lineNumbers = csvMap.get(key) || [];
      lineNumbers.push(index + 2);
      csvMap.set(key, lineNumbers);
    });

    const csvDuplicates = Array.from(csvMap.entries())
      .filter(([_, lineNumbers]) => lineNumbers.length > 1)
      .map(([key, lineNumbers]) => {
        const [studentId, questionId] = key.split(':');
        return {
          studentId,
          questionId,
          lineNumbers,
        };
      });

    return {
      duplicates,
      csvDuplicates,
    };
  }

  // 回答ID生成
  private generateAnswerId(studentId: string, questionId: string): string {
    return `answer_${studentId}_${questionId}_${Date.now()}`;
  }

  // ファイルからCSVを読み込んでAnswersに変換
  async parseAnswersFromCsv(file: File, exam: { id: string; questions: Question[] }): Promise<Answer[]> {
    const csvContent = await this.readFile(file);
    const parseResult = this.parseCSV(csvContent);

    if (!parseResult.success) {
      throw new Error(`CSV読み込みエラー: ${parseResult.errors.join(', ')}`);
    }

    const importResult = await this.importAnswers(parseResult.data, exam.id, exam.questions);

    if (!importResult.success) {
      throw new Error(`CSVインポートエラー: ${importResult.errors.join(', ')}`);
    }

    return importResult.answers;
  }

  // CSV形式での回答エクスポート
  exportAnswersToCSV(answers: Answer[]): string {
    const headers = ['student_id', 'question_id', 'answer_content'];
    const rows = [headers.join(',')];

    for (const answer of answers) {
      const csvRow = [
        this.escapeCSVField(answer.studentId),
        this.escapeCSVField(answer.questionId),
        this.escapeCSVField(answer.content),
      ].join(',');

      rows.push(csvRow);
    }

    return rows.join('\n');
  }

  // CSVフィールドのエスケープ
  private escapeCSVField(field: string): string {
    // カンマ、改行、クォートが含まれる場合はクォートで囲む
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      // クォートをエスケープしてから全体をクォートで囲む
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  // CSVテンプレート生成
  generateTemplate(questions: Question[]): string {
    const headers = ['student_id', 'question_id', 'answer_content'];
    const rows = [headers.join(',')];

    // サンプル行を追加
    for (let i = 0; i < Math.min(3, questions.length); i++) {
      const question = questions[i];
      const sampleRow = [
        `S00${i + 1}`,
        question.id,
        'ここに回答を入力してください...',
      ].join(',');

      rows.push(sampleRow);
    }

    return rows.join('\n');
  }
}

export const csvService = new CSVService();