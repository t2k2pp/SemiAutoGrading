import React, { useState } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';

const SecondGrading: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<{
    score: '○' | '△' | '×';
    points: number;
    reason: string;
    changes: string;
  } | null>(null);

  const handleResultSelect = (resultId: string) => {
    setSelectedResult(resultId);
    const result = state.gradingResults.find(r => r.id === resultId);
    if (result) {
      setEditingGrade({
        score: result.firstGrade.score,
        points: result.firstGrade.points,
        reason: result.firstGrade.reason,
        changes: ''
      });
    }
  };

  const handleGradeUpdate = () => {
    if (!selectedResult || !editingGrade) return;

    const result = state.gradingResults.find(r => r.id === selectedResult);
    if (!result) return;

    const updatedResult = {
      ...result,
      secondGrade: {
        score: editingGrade.score,
        points: editingGrade.points,
        reason: editingGrade.reason,
        changes: editingGrade.changes,
        gradedAt: new Date(),
        graderId: 'human'
      }
    };

    dispatch({ type: 'UPDATE_GRADING_RESULT', payload: updatedResult });
    setSelectedResult(null);
    setEditingGrade(null);
  };

  const selectedGradingResult = selectedResult ?
    state.gradingResults.find(r => r.id === selectedResult) : null;

  const selectedAnswer = selectedGradingResult ?
    state.answers.find(a => a.id === selectedGradingResult.answerId) : null;

  const selectedQuestion = selectedAnswer && state.currentExam ?
    state.currentExam.questions.find(q => q.id === selectedAnswer.questionId) : null;

  const renderResultsList = () => {
    const resultsWithSecondGrade = state.gradingResults.filter(r => r.secondGrade);
    const resultsWithoutSecondGrade = state.gradingResults.filter(r => !r.secondGrade);

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>採点結果一覧</h3>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            二次採点済み: {resultsWithSecondGrade.length} / 未完了: {resultsWithoutSecondGrade.length}
          </div>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {resultsWithoutSecondGrade.length > 0 && (
            <>
              <div style={{ padding: '15px 20px', backgroundColor: '#fff8e1', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f57c00' }}>
                  要確認（二次採点未完了）
                </div>
              </div>
              {resultsWithoutSecondGrade.map(result => {
                const answer = state.answers.find(a => a.id === result.answerId);
                const question = state.currentExam?.questions.find(q => q.id === answer?.questionId);

                return (
                  <div
                    key={result.id}
                    style={{
                      padding: '15px 20px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: selectedResult === result.id ? '#e3f2fd' : 'white',
                      borderLeft: selectedResult === result.id ? '4px solid #2196f3' : '4px solid transparent'
                    }}
                    onClick={() => handleResultSelect(result.id)}
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
                      AI判定: {result.firstGrade.reason}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {resultsWithSecondGrade.length > 0 && (
            <>
              <div style={{ padding: '15px 20px', backgroundColor: '#e8f5e8', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d2e' }}>
                  完了（二次採点済み）
                </div>
              </div>
              {resultsWithSecondGrade.map(result => {
                const answer = state.answers.find(a => a.id === result.answerId);
                const question = state.currentExam?.questions.find(q => q.id === answer?.questionId);

                return (
                  <div
                    key={result.id}
                    style={{
                      padding: '15px 20px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: selectedResult === result.id ? '#e3f2fd' : 'white',
                      borderLeft: selectedResult === result.id ? '4px solid #2196f3' : '4px solid transparent'
                    }}
                    onClick={() => handleResultSelect(result.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {answer?.studentId} - 問{question?.number}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{
                          fontSize: '14px',
                          color: result.firstGrade.score === '○' ? '#28a745' :
                                 result.firstGrade.score === '△' ? '#ffc107' : '#dc3545'
                        }}>
                          AI: {result.firstGrade.score}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: result.secondGrade!.score === '○' ? '#28a745' :
                                 result.secondGrade!.score === '△' ? '#ffc107' : '#dc3545'
                        }}>
                          最終: {result.secondGrade!.score} ({result.secondGrade!.points}点)
                        </div>
                      </div>
                    </div>
                    {result.secondGrade?.changes && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        変更理由: {result.secondGrade.changes}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderGradingForm = () => {
    if (!selectedGradingResult || !selectedAnswer || !selectedQuestion || !editingGrade) {
      return (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          textAlign: 'center',
          color: '#666'
        }}>
          左の一覧から採点結果を選択してください
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
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            {selectedAnswer.studentId} - 問{selectedQuestion.number}: {selectedQuestion.title}
          </h3>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>問題文</h4>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {selectedQuestion.content}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>学生の回答</h4>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              fontSize: '14px',
              lineHeight: '1.5',
              minHeight: '100px'
            }}>
              {selectedAnswer.content}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>模範解答</h4>
            <div style={{
              backgroundColor: '#e8f5e8',
              padding: '15px',
              borderRadius: '4px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {selectedQuestion.sampleAnswer}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>AI採点結果</h4>
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '15px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>判定: </strong>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: selectedGradingResult.firstGrade.score === '○' ? '#28a745' :
                         selectedGradingResult.firstGrade.score === '△' ? '#ffc107' : '#dc3545'
                }}>
                  {selectedGradingResult.firstGrade.score} ({selectedGradingResult.firstGrade.points}点)
                </span>
              </div>
              <div>
                <strong>理由: </strong>
                {selectedGradingResult.firstGrade.reason}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>最終判定</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              {(['○', '△', '×'] as const).map(score => (
                <button
                  key={score}
                  style={{
                    padding: '10px 20px',
                    border: `2px solid ${editingGrade.score === score ? '#007bff' : '#dee2e6'}`,
                    backgroundColor: editingGrade.score === score ? '#007bff' : 'white',
                    color: editingGrade.score === score ? 'white' : '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  onClick={() => setEditingGrade({
                    ...editingGrade,
                    score,
                    points: score === '○' ? selectedQuestion.maxScore :
                           score === '△' ? Math.floor(selectedQuestion.maxScore / 2) : 0
                  })}
                >
                  {score}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                点数 (最大{selectedQuestion.maxScore}点)
              </label>
              <input
                type="number"
                min="0"
                max={selectedQuestion.maxScore}
                value={editingGrade.points}
                onChange={(e) => setEditingGrade({
                  ...editingGrade,
                  points: parseInt(e.target.value) || 0
                })}
                style={{
                  width: '100px',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
              変更理由（AI判定から変更する場合は必須）
            </label>
            <textarea
              value={editingGrade.changes}
              onChange={(e) => setEditingGrade({
                ...editingGrade,
                changes: e.target.value
              })}
              placeholder="AI判定を変更する理由を入力してください..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              onClick={handleGradeUpdate}
            >
              二次採点を保存
            </button>
            <button
              style={{
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedResult(null);
                setEditingGrade(null);
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!state.currentExam) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>二次採点</h2>
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

  if (state.gradingResults.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>二次採点</h2>
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            一次採点が完了していません。まず一次採点を実行してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ marginBottom: '30px' }}>二次採点（人間による確認・修正）</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', height: 'calc(100vh - 200px)' }}>
        {renderResultsList()}
        {renderGradingForm()}
      </div>
    </div>
  );
};

export default SecondGrading;