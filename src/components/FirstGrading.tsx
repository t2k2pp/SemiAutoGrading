import React, { useState, useEffect } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import { llmService } from '../services/llmService';
import type { Answer, Question, SubQuestion, GradingResult, FirstGrade } from '../contexts/SimpleAppContext';

const FirstGrading: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const [isGrading, setIsGrading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(0);
  const [gradingProgress, setGradingProgress] = useState('');
  const [ungradedAnswers, setUngradedAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    const graded = new Set(state.gradingResults.map(r => r.answerId));
    const ungraded = state.answers.filter(answer => !graded.has(answer.id));
    setUngradedAnswers(ungraded);
  }, [state.answers, state.gradingResults]);

  const findSubQuestion = (answer: Answer): { question: Question; subQuestion: SubQuestion } | null => {
    if (!state.currentExam) return null;

    const question = state.currentExam.questions.find(q => q.id === answer.questionId);
    if (!question) return null;

    const subQuestion = question.subQuestions.find(sq => sq.id === answer.subQuestionId);
    if (!subQuestion) return null;

    return { question, subQuestion };
  };

  const startGrading = async () => {
    if (!state.currentExam || ungradedAnswers.length === 0) return;

    try {
      setIsGrading(true);
      dispatch({ type: 'SET_LOADING', payload: true });

      // LLMサービスの設定を更新
      llmService.updateConfig(state.llmConfig);

      for (let i = 0; i < ungradedAnswers.length; i++) {
        const answer = ungradedAnswers[i];
        const questionData = findSubQuestion(answer);

        if (!questionData) {
          console.warn(`設問が見つかりません: ${answer.subQuestionId}`);
          continue;
        }

        const { question, subQuestion } = questionData;

        setCurrentAnswer(i + 1);
        setGradingProgress(
          `${answer.studentId} - ${question.number} ${subQuestion.number}を採点中...`
        );

        try {
          const llmResult = await llmService.gradeAnswer(subQuestion, answer);

          const firstGrade: FirstGrade = {
            score: llmResult.score,
            points: llmResult.points,
            reason: llmResult.reason,
            gradedAt: new Date(),
            graderId: 'llm-first-grader'
          };

          const gradingResult: GradingResult = {
            id: `grading_${answer.id}_${Date.now()}`,
            answerId: answer.id,
            firstGrade
          };

          dispatch({ type: 'ADD_GRADING_RESULT', payload: gradingResult });
        } catch (error) {
          console.error(`採点エラー (${answer.studentId}):`, error);

          // エラーの場合は低スコアで記録
          const firstGrade: FirstGrade = {
            score: '×',
            points: 0,
            reason: `採点処理でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
            gradedAt: new Date(),
            graderId: 'llm-first-grader'
          };

          const gradingResult: GradingResult = {
            id: `grading_${answer.id}_${Date.now()}`,
            answerId: answer.id,
            firstGrade
          };

          dispatch({ type: 'ADD_GRADING_RESULT', payload: gradingResult });
        }

        // API呼び出し間隔を空ける
        if (i < ungradedAnswers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setGradingProgress('一次採点が完了しました');
      setTimeout(() => {
        setGradingProgress('');
        setCurrentAnswer(0);
      }, 2000);

    } catch (error) {
      console.error('一次採点でエラーが発生:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: `一次採点でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      });
    } finally {
      setIsGrading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const renderGradingResults = () => {
    if (state.gradingResults.length === 0) return null;

    return (
      <div style={{
        marginTop: '30px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>採点結果一覧</h3>
        </div>
        <div style={{ padding: '20px' }}>
          {state.gradingResults.map((result) => {
            const answer = state.answers.find(a => a.id === result.answerId);
            const questionData = answer ? findSubQuestion(answer) : null;

            if (!answer || !questionData) return null;

            const { question, subQuestion } = questionData;

            return (
              <div
                key={result.id}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '15px',
                  marginBottom: '15px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <strong>{answer.studentId}</strong> - {question.number} {subQuestion.number}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <span style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: result.firstGrade.score === '○' ? '#28a745' :
                             result.firstGrade.score === '△' ? '#ffc107' : '#dc3545'
                    }}>
                      {result.firstGrade.score}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      {result.firstGrade.points}/{subQuestion.maxScore}点
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>回答:</strong> {answer.content.substring(0, 100)}{answer.content.length > 100 ? '...' : ''}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <strong>採点理由:</strong> {result.firstGrade.reason}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <h2 style={{ marginBottom: '30px' }}>一次採点 (LLM自動採点)</h2>

      {!state.currentExam ? (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>注意</h3>
          <p style={{ margin: 0, color: '#856404' }}>
            採点を開始する前に、まず試験設定で試験を作成してください。
          </p>
        </div>
      ) : state.answers.length === 0 ? (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>注意</h3>
          <p style={{ margin: 0, color: '#856404' }}>
            採点を開始する前に、CSV読み込みで回答データをアップロードしてください。
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          marginBottom: '30px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>採点状況</h3>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>回答総数</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{state.answers.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>採点済み</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{state.gradingResults.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>未採点</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{ungradedAnswers.length}</div>
              </div>
            </div>

            {isGrading && (
              <div style={{
                backgroundColor: '#e7f3ff',
                border: '1px solid #b3d9ff',
                borderRadius: '4px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  採点中... ({currentAnswer}/{ungradedAnswers.length})
                </div>
                <div style={{ color: '#666' }}>
                  {gradingProgress}
                </div>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  height: '8px',
                  marginTop: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: '#007bff',
                    height: '100%',
                    width: `${(currentAnswer / ungradedAnswers.length) * 100}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            <button
              style={{
                padding: '15px 30px',
                backgroundColor: ungradedAnswers.length > 0 && !isGrading ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: ungradedAnswers.length > 0 && !isGrading ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              onClick={startGrading}
              disabled={ungradedAnswers.length === 0 || isGrading}
            >
              {isGrading ? '採点中...' : ungradedAnswers.length > 0 ? '一次採点を開始' : '採点対象なし'}
            </button>
          </div>
        </div>
      )}

      {renderGradingResults()}
    </div>
  );
};

export default FirstGrading;