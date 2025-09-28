import type { LLMConfig, Question, Answer, LLMProvider } from '../contexts/SimpleAppContext';

interface LLMGradingResponse {
  score: '○' | '△' | '×';
  points: number;
  reason: string;
  confidence: number;
}

interface GradingPrompt {
  systemPrompt: string;
  questionContext: string;
  answerToGrade: string;
  gradingCriteria: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  // 設定更新
  updateConfig(config: LLMConfig): void {
    this.config = config;
  }

  // LM Studio接続テスト
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      return response.ok;
    } catch (error) {
      console.error('LM Studio接続テストに失敗:', error);
      return false;
    }
  }

  // 利用可能なモデル一覧取得
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error('モデル一覧取得に失敗:', error);
      throw new Error('モデル一覧の取得に失敗しました');
    }
  }

  // 採点プロンプト生成
  private generateGradingPrompt(question: Question, answer: Answer): GradingPrompt {
    const systemPrompt = `You are a grader for the IPA Project Manager certification exam.
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
}`;

    const questionContext = `QUESTION:
${question.content}

QUESTION INTENT:
${question.intention}

SAMPLE ANSWER:
${question.sampleAnswer}

MAX SCORE: ${question.maxScore} points`;

    const answerToGrade = `STUDENT ANSWER TO GRADE:
Student ID: ${answer.studentId}
Answer Content: ${answer.content}`;

    const gradingCriteria = `GRADING CRITERIA:
- Does the answer accurately understand the question requirements?
- Does the answer align with the question intent?
- How much does the answer include elements from the sample answer?
- Are appropriate PM knowledge and expressions used?
- Is the content logical and consistent?`;

    return {
      systemPrompt,
      questionContext,
      answerToGrade,
      gradingCriteria,
    };
  }

  // LLMを使った採点実行
  async gradeAnswer(question: Question, answer: Answer): Promise<LLMGradingResponse> {
    const prompt = this.generateGradingPrompt(question, answer);

    const userPrompt = `${prompt.questionContext}

${prompt.answerToGrade}

${prompt.gradingCriteria}

Please grade the student answer based on the above information and return the result in JSON format.`;

    try {
      let url = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let requestBody: any = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: this.config.temperature
      };

      // 最大トークン数制限を使用する場合のみ追加
      if (this.config.useMaxTokens) {
        requestBody.max_tokens = this.config.maxTokens;
      }

      // プロバイダー別の設定
      switch (this.config.provider) {
        case 'lm-studio':
          url = `${this.config.endpoint}/chat/completions`;
          headers['Authorization'] = 'Bearer dummy-key';
          break;

        case 'ollama':
          url = `${this.config.ollamaHost || this.config.endpoint}/v1/chat/completions`;
          break;

        case 'azure-openai':
          if (this.config.apiVersion?.includes('v1')) {
            // New v1 API format
            url = `${this.config.endpoint}/openai/v1/chat/completions`;
          } else {
            // Traditional format
            url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentId}/chat/completions?api-version=${this.config.apiVersion}`;
          }
          if (this.config.apiKey) {
            headers['api-key'] = this.config.apiKey;
          }
          break;

        case 'gemini':
          // Convert to Gemini format
          url = `${this.config.endpoint}/models/${this.config.model}:generateContent`;
          if (this.config.geminiApiKey) {
            headers['x-goog-api-key'] = this.config.geminiApiKey;
          }
          const generationConfig: any = {
            temperature: this.config.temperature,
          };

          // 最大トークン数制限を使用する場合のみ追加
          if (this.config.useMaxTokens) {
            generationConfig.maxOutputTokens = this.config.maxTokens;
          }

          requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: `${prompt.systemPrompt}\n\n${userPrompt}`
                  }
                ]
              }
            ],
            generationConfig
          };
          break;

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      console.log('Making request to:', url);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      let content = '';

      // プロバイダー別のレスポンス解析
      switch (this.config.provider) {
        case 'lm-studio':
        case 'ollama':
        case 'azure-openai':
          content = data.choices?.[0]?.message?.content;
          break;
        case 'gemini':
          content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          break;
      }

      if (!content) {
        throw new Error('LLMからの応答が空です');
      }

      console.log('LLM Response:', content);

      // JSON解析
      let gradingResult: LLMGradingResponse;
      try {
        // ```json ``` で囲まれている場合の処理
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          gradingResult = JSON.parse(jsonMatch[1]);
        } else {
          gradingResult = JSON.parse(content);
        }
      } catch (parseError) {
        // JSONパースに失敗した場合、正規表現でマニュアル抽出を試みる
        gradingResult = this.extractGradingFromText(content);
      }

      // 結果の検証
      this.validateGradingResponse(gradingResult, question.maxScore);

      return gradingResult;
    } catch (error) {
      console.error('LLM採点に失敗:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('採点がタイムアウトしました');
        }
        throw new Error(`採点処理でエラーが発生しました: ${error.message}`);
      }

      throw new Error('採点処理で不明なエラーが発生しました');
    }
  }

  // テキストから採点結果を抽出（JSONパース失敗時のフォールバック）
  private extractGradingFromText(text: string): LLMGradingResponse {
    console.log('Extracting from text:', text);

    // 複数パターンでスコアを検索
    const scorePatterns = [
      /["']?score["']?\s*:\s*["']([○△×])["']/,
      /score\s*:\s*([○△×])/,
      /([○△×])/,
      /grade\s*:\s*([○△×])/
    ];

    const pointsPatterns = [
      /["']?points?["']?\s*:\s*(\d+)/,
      /points?\s*:\s*(\d+)/,
      /(\d+)\s*points?/,
      /score:\s*(\d+)/
    ];

    const reasonPatterns = [
      /["']?reason["']?\s*:\s*["']([^"']+)["']/,
      /reason\s*:\s*(.+?)(?:\n|$)/,
      /because\s*:\s*(.+?)(?:\n|$)/,
      /explanation\s*:\s*(.+?)(?:\n|$)/
    ];

    let scoreMatch = null;
    for (const pattern of scorePatterns) {
      scoreMatch = text.match(pattern);
      if (scoreMatch) break;
    }

    let pointsMatch = null;
    for (const pattern of pointsPatterns) {
      pointsMatch = text.match(pattern);
      if (pointsMatch) break;
    }

    let reasonMatch = null;
    for (const pattern of reasonPatterns) {
      reasonMatch = text.match(pattern);
      if (reasonMatch) break;
    }

    if (!scoreMatch) {
      console.error('No score found in text:', text);
      throw new Error('採点結果のスコアを抽出できませんでした');
    }

    return {
      score: scoreMatch[1] as '○' | '△' | '×',
      points: pointsMatch ? parseInt(pointsMatch[1], 10) : 5,
      reason: reasonMatch ? reasonMatch[1].trim() : '採点理由を抽出できませんでした',
    };
  }

  // 採点結果の妥当性検証
  private validateGradingResponse(response: LLMGradingResponse, maxScore: number): void {
    if (!['○', '△', '×'].includes(response.score)) {
      throw new Error(`無効なスコア: ${response.score}`);
    }

    if (typeof response.points !== 'number' || response.points < 0 || response.points > maxScore) {
      throw new Error(`無効な点数: ${response.points} (最大: ${maxScore})`);
    }

    if (!response.reason || typeof response.reason !== 'string' || response.reason.length === 0) {
      throw new Error('採点理由が無効です');
    }

    // 点数とスコアの整合性チェック
    const pointPercentage = (response.points / maxScore) * 100;

    if (response.score === '○' && pointPercentage < 80) {
      console.warn(`スコア○だが点数が低い: ${response.points}/${maxScore} (${pointPercentage.toFixed(1)}%)`);
    } else if (response.score === '△' && (pointPercentage < 50 || pointPercentage >= 80)) {
      console.warn(`スコア△だが点数が範囲外: ${response.points}/${maxScore} (${pointPercentage.toFixed(1)}%)`);
    } else if (response.score === '×' && pointPercentage >= 50) {
      console.warn(`スコア×だが点数が高い: ${response.points}/${maxScore} (${pointPercentage.toFixed(1)}%)`);
    }
  }

  // バッチ採点（複数回答の一括処理）
  async gradeBatch(
    questions: Question[],
    answers: Answer[],
    onProgress?: (current: number, total: number) => void
  ): Promise<LLMGradingResponse[]> {
    const results: LLMGradingResponse[] = [];
    const total = answers.length;

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = questions.find(q => q.id === answer.questionId);

      if (!question) {
        throw new Error(`問題が見つかりません: ${answer.questionId}`);
      }

      try {
        const result = await this.gradeAnswer(question, answer);
        results.push(result);

        if (onProgress) {
          onProgress(i + 1, total);
        }

        // API呼び出し間隔を空ける（レート制限対策）
        if (i < answers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`回答の採点に失敗 (学生ID: ${answer.studentId}, 問題: ${question.number}):`, error);

        // エラーの場合は低スコアで代替
        results.push({
          score: '×',
          points: 0,
          reason: `採点処理でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        });

        if (onProgress) {
          onProgress(i + 1, total);
        }
      }
    }

    return results;
  }

  // 採点一貫性チェック（同じ回答を複数回採点して比較）
  async checkConsistency(question: Question, answer: Answer, iterations: number = 3): Promise<{
    results: LLMGradingResponse[];
    isConsistent: boolean;
    variance: number;
  }> {
    const results: LLMGradingResponse[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.gradeAnswer(question, answer);
      results.push(result);

      // 呼び出し間隔
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 点数のばらつきを計算
    const points = results.map(r => r.points);
    const average = points.reduce((sum, p) => sum + p, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / points.length;

    // 一貫性判定（標準偏差が配点の10%以下なら一貫している）
    const standardDeviation = Math.sqrt(variance);
    const isConsistent = standardDeviation <= (question.maxScore * 0.1);

    return {
      results,
      isConsistent,
      variance,
    };
  }
}

export const llmService = new LLMService({
  endpoint: 'http://127.0.0.1:1234/v1',
  model: 'gemma-3n-e4b-it-text',
  temperature: 0.1,
  maxTokens: 500,
  timeout: 120000
});