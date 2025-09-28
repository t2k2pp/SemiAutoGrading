import React, { useState, useEffect } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import type { Answer, Question, SubQuestion, GradingResult, SecondGrade } from '../contexts/SimpleAppContext';

const SecondGrading: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const [selectedResult, setSelectedResult] = useState<GradingResult | null>(null);
  const [secondGradeForm, setSecondGradeForm] = useState({
    score: '○' as '○' | '△' | '×',
    points: 0,
    reason: '',
    changes: ''
  });

  useEffect(() => {
    if (selectedResult) {
      const existing = selectedResult.secondGrade;
      if (existing) {
        setSecondGradeForm({
          score: existing.score,
          points: existing.points,
          reason: existing.reason,
          changes: existing.changes
        });
      } else {
        // 一次採点結果をベースに初期化
        setSecondGradeForm({
          score: selectedResult.firstGrade.score,
          points: selectedResult.firstGrade.points,
          reason: selectedResult.firstGrade.reason,
          changes: ''
        });
      }
    }
  }, [selectedResult]);

  const findSubQuestion = (answer: Answer): { question: Question; subQuestion: SubQuestion } | null => {
    if (!state.currentExam) return null;

    const question = state.currentExam.questions.find(q => q.id === answer.questionId);
    if (!question) return null;

    const subQuestion = question.subQuestions.find(sq => sq.id === answer.subQuestionId);
    if (!subQuestion) return null;

    return { question, subQuestion };
  };

  const handleSecondGrading = () => {
    if (!selectedResult) return;

    const secondGrade: SecondGrade = {
      score: secondGradeForm.score,
      points: secondGradeForm.points,
      reason: secondGradeForm.reason,
      gradedAt: new Date(),
      graderId: 'human-second-grader',
      changes: secondGradeForm.changes
    };

    const updatedResult: GradingResult = {
      ...selectedResult,
      secondGrade
    };

    dispatch({ type: 'UPDATE_GRADING_RESULT', payload: updatedResult });
    setSelectedResult(updatedResult);
  };

  const getScoreColor = (score: '○' | '△' | '×') => {
    switch (score) {
      case '○': return '#28a745';
      case '△': return '#ffc107';
      case '×': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderResultsList = () => {
    if (state.gradingResults.length === 0) {
      return (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>一次採点結果がありません</h3>
          <p style={{ margin: 0, color: '#856404' }}>
            まず「一次採点」でLLMによる自動採点を実行してください。
          </p>
        </div>
      );
    }

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>一次採点結果一覧</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            確認・調整したい採点結果をクリックしてください
          </p>
        </div>
        <div style={{ padding: '20px' }}>
          {state.gradingResults.map((result) => {
            const answer = state.answers.find(a => a.id === result.answerId);
            const questionData = answer ? findSubQuestion(answer) : null;

            if (!answer || !questionData) return null;

            const { question, subQuestion } = questionData;
            const isSelected = selectedResult?.id === result.id;
            const hasSecondGrade = !!result.secondGrade;

            return (
              <div
                key={result.id}
                style={{
                  border: `2px solid ${isSelected ? '#007bff' : '#dee2e6'}`,
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f8f9ff' : '#fff',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedResult(result)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <strong>{answer.studentId}</strong>
                    <span>{question.number} {subQuestion.number}</span>
                    {hasSecondGrade && (
                      <span style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        二次採点済み
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>一次</div>
                      <span style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: getScoreColor(result.firstGrade.score)
                      }}>
                        {result.firstGrade.score}
                      </span>
                      <div style={{ fontSize: '12px' }}>
                        {result.firstGrade.points}/{subQuestion.maxScore}
                      </div>
                    </div>
                    {hasSecondGrade && (
                      <>
                        <span style={{ color: '#666' }}>→</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>二次</div>
                          <span style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: getScoreColor(result.secondGrade!.score)
                          }}>
                            {result.secondGrade!.score}
                          </span>
                          <div style={{ fontSize: '12px' }}>
                            {result.secondGrade!.points}/{subQuestion.maxScore}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {answer.content.substring(0, 150)}{answer.content.length > 150 ? '...' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGradingPanel = () => {
    if (!selectedResult) return null;

    const answer = state.answers.find(a => a.id === selectedResult.answerId);
    const questionData = answer ? findSubQuestion(answer) : null;

    if (!answer || !questionData) return null;

    const { question, subQuestion } = questionData;

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            二次採点: {answer.studentId} - {question.number} {subQuestion.number}
          </h3>
        </div>
        <div style={{ padding: '20px' }}>
          {/* 設問情報 */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>設問</h4>
            <p style={{ margin: '0 0 15px 0' }}>{subQuestion.content}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px' }}>
              <div>
                <strong>出題意図:</strong> {subQuestion.intention}
              </div>
              <div>
                <strong>配点:</strong> {subQuestion.maxScore}点
                {subQuestion.characterLimit && (
                  <span> (文字制限: {subQuestion.characterLimit}字)</span>
                )}
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <strong>模範解答:</strong> {subQuestion.sampleAnswer}
            </div>
          </div>

          {/* 学生回答 */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>学生回答</h4>
            <p style={{ margin: 0 }}>{answer.content}</p>
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
              文字数: {answer.characterCount}
              {subQuestion.characterLimit && answer.characterCount > subQuestion.characterLimit && (
                <span style={{ color: '#dc3545', marginLeft: '10px' }}>
                  (制限超過: +{answer.characterCount - subQuestion.characterLimit}字)
                </span>
              )}
            </div>
          </div>

          {/* 一次採点結果 */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>一次採点結果 (LLM)</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: getScoreColor(selectedResult.firstGrade.score)
              }}>
                {selectedResult.firstGrade.score}
              </span>
              <span style={{ fontWeight: 'bold' }}>
                {selectedResult.firstGrade.points}/{subQuestion.maxScore}点
              </span>
            </div>
            <div>
              <strong>採点理由:</strong> {selectedResult.firstGrade.reason}
            </div>
          </div>

          {/* 二次採点フォーム */}
          <div style={{ padding: '20px', backgroundColor: '#f0f8f0', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>二次採点 (人間による確認・調整)</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                  評価
                </label>
                {['○', '△', '×'].map((score) => (
                  <label key={score} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="score"
                      value={score}
                      checked={secondGradeForm.score === score}
                      onChange={(e) => setSecondGradeForm({ ...secondGradeForm, score: e.target.value as '○' | '△' | '×' })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '18px', color: getScoreColor(score as '○' | '△' | '×') }}>
                      {score}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                  点数
                </label>
                <input
                  type="number"
                  value={secondGradeForm.points}
                  onChange={(e) => setSecondGradeForm({ ...secondGradeForm, points: parseInt(e.target.value) || 0 })}
                  min="0"
                  max={subQuestion.maxScore}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  最大: {subQuestion.maxScore}点
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                採点理由
              </label>
              <textarea
                value={secondGradeForm.reason}
                onChange={(e) => setSecondGradeForm({ ...secondGradeForm, reason: e.target.value })}
                placeholder="採点の根拠を入力してください"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                変更内容・コメント
              </label>
              <textarea
                value={secondGradeForm.changes}
                onChange={(e) => setSecondGradeForm({ ...secondGradeForm, changes: e.target.value })}
                placeholder="一次採点から変更した点や追加のコメントを記録してください"
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              onClick={handleSecondGrading}
            >
              二次採点を{selectedResult.secondGrade ? '更新' : '実行'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <h2 style={{ marginBottom: '30px' }}>二次採点 (人間による確認・調整)</h2>

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
            二次採点を開始する前に、まず試験設定で試験を作成してください。
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedResult ? '1fr 1fr' : '1fr', gap: '30px' }}>
          <div>
            {renderResultsList()}
          </div>
          {selectedResult && (
            <div>
              {renderGradingPanel()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecondGrading;