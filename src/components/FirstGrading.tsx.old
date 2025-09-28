import React, { useState, useEffect } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import { gradeAnswer } from '../services/gradingService';

const FirstGrading: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const [isGrading, setIsGrading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(0);
  const [gradingProgress, setGradingProgress] = useState('');
  const [ungradedAnswers, setUngradedAnswers] = useState<string[]>([]);

  useEffect(() => {
    const graded = new Set(state.gradingResults.map(r => r.answerId));
    const ungraded = state.answers
      .filter(answer => !graded.has(answer.id))
      .map(answer => answer.id);
    setUngradedAnswers(ungraded);
  }, [state.answers, state.gradingResults]);

  const startGrading = async () => {
    if (!state.currentExam || ungradedAnswers.length === 0) return;

    try {
      setIsGrading(true);
      dispatch({ type: 'SET_LOADING', payload: true });

      for (let i = 0; i < ungradedAnswers.length; i++) {
        const answerId = ungradedAnswers[i];
        const answer = state.answers.find(a => a.id === answerId);
        const question = state.currentExam.questions.find(q => q.id === answer?.questionId);

        if (!answer || !question) continue;

        setCurrentAnswer(i + 1);
        setGradingProgress(`${answer.studentId} - 問${question.number}を採点中...`);

        const gradingResult = await gradeAnswer(
          answer,
          question,
          state.llmConfig
        );

        dispatch({ type: 'ADD_GRADING_RESULT', payload: gradingResult });

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setGradingProgress('一次採点が完了しました');
      setTimeout(() => {
        setGradingProgress('');
        setCurrentAnswer(0);
      }, 2000);

    } catch (error) {
      console.error('採点エラー:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '採点に失敗しました'
      });
    } finally {
      setIsGrading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const renderGradingStatus = () => {
    const totalAnswers = state.answers.length;
    const gradedAnswers = state.gradingResults.length;
    const progress = totalAnswers > 0 ? (gradedAnswers / totalAnswers) * 100 : 0;

    return (
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
          <h3 style={{ margin: 0, fontSize: '16px' }}>採点進捗</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>総回答数</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalAnswers}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>採点済み</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{gradedAnswers}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>未採点</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{ungradedAnswers.length}</div>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>進捗率</span>
              <span style={{ fontSize: '14px', color: '#666' }}>{progress.toFixed(1)}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {isGrading && (
            <div style={{
              backgroundColor: '#e7f3ff',
              border: '1px solid #b3d7ff',
              borderRadius: '4px',
              padding: '15px',
              marginTop: '15px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                採点中... ({currentAnswer}/{ungradedAnswers.length})
              </div>
              <div style={{ color: '#666' }}>{gradingProgress}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLLMConfig = () => (
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>LLM設定</h3>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px' }}>
          <div>
            <span style={{ color: '#666' }}>エンドポイント:</span>
            <div style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
              {state.llmConfig.endpoint}
            </div>
          </div>
          <div>
            <span style={{ color: '#666' }}>モデル:</span>
            <div style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
              {state.llmConfig.model}
            </div>
          </div>
          <div>
            <span style={{ color: '#666' }}>Temperature:</span>
            <div style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
              {state.llmConfig.temperature}
            </div>
          </div>
          <div>
            <span style={{ color: '#666' }}>Max Tokens:</span>
            <div style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
              {state.llmConfig.maxTokens}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecentResults = () => {
    const recentResults = state.gradingResults.slice(-5);
    if (recentResults.length === 0) return null;

    return (
      <div style={{
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
          <h3 style={{ margin: 0, fontSize: '16px' }}>最近の採点結果</h3>
        </div>
        <div style={{ padding: '20px' }}>
          {recentResults.map(result => {
            const answer = state.answers.find(a => a.id === result.answerId);
            const question = state.currentExam?.questions.find(q => q.id === answer?.questionId);

            return (
              <div
                key={result.id}
                style={{
                  borderBottom: '1px solid #eee',
                  paddingBottom: '15px',
                  marginBottom: '15px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {answer?.studentId} - 問{question?.number}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: result.firstGrade.score === '○' ? '#28a745' :
                           result.firstGrade.score === '△' ? '#ffc107' : '#dc3545'
                  }}>
                    {result.firstGrade.score} ({result.firstGrade.points}点)
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {result.firstGrade.reason}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!state.currentExam) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>一次採点</h2>
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            試験が選択されていません。まず試験設定で試験を作成・選択してください。
          </p>
        </div>
      </div>
    );
  }

  if (state.answers.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>一次採点</h2>
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            回答データがありません。CSV読み込みで回答データをアップロードしてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>一次採点（AI自動採点）</h2>
        <button
          style={{
            padding: '12px 24px',
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
          {isGrading ? '採点中...' : ungradedAnswers.length > 0 ? '一次採点を開始' : '採点完了'}
        </button>
      </div>

      {renderGradingStatus()}
      {renderLLMConfig()}
      {renderRecentResults()}
    </div>
  );
};

export default FirstGrading;