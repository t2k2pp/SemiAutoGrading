import React, { useState } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import type { Exam, Question, SubQuestion } from '../contexts/SimpleAppContext';

const ExamSetup: React.FC = () => {
  const { dispatch } = useSimpleApp();
  const [examName, setExamName] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'examId'>[]>([
    {
      number: '1',
      caseStudyTitle: '',
      backgroundDescription: '',
      subQuestions: [
        {
          id: '', // 後で設定
          questionId: '', // 後で設定
          number: '設問1',
          content: '',
          intention: '',
          sampleAnswer: '',
          maxScore: 10,
          characterLimit: undefined
        }
      ]
    }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, {
      number: `問${questions.length + 1}`,
      caseStudyTitle: '',
      backgroundDescription: '',
      subQuestions: [
        {
          id: '', // 後で設定
          questionId: '', // 後で設定
          number: '設問1',
          content: '',
          intention: '',
          sampleAnswer: '',
          maxScore: 10,
          characterLimit: undefined
        }
      ]
    }]);
  };

  // 問題レベルの更新
  const updateQuestion = (index: number, field: keyof Omit<Question, 'id' | 'examId'>, value: string | SubQuestion[]) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  // 設問レベルの更新
  const updateSubQuestion = (questionIndex: number, subQuestionIndex: number, field: keyof Omit<SubQuestion, 'id' | 'questionId'>, value: string | number) => {
    const updatedQuestions = [...questions];
    const updatedSubQuestions = [...updatedQuestions[questionIndex].subQuestions];
    updatedSubQuestions[subQuestionIndex] = { ...updatedSubQuestions[subQuestionIndex], [field]: value };
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], subQuestions: updatedSubQuestions };
    setQuestions(updatedQuestions);
  };

  // 設問の追加
  const addSubQuestion = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    const currentSubQuestions = updatedQuestions[questionIndex].subQuestions;
    const newSubQuestion: Omit<SubQuestion, 'id' | 'questionId'> = {
      number: `設問${currentSubQuestions.length + 1}`,
      content: '',
      intention: '',
      sampleAnswer: '',
      maxScore: 10,
      characterLimit: undefined
    };
    updatedQuestions[questionIndex].subQuestions = [...currentSubQuestions, newSubQuestion as SubQuestion];
    setQuestions(updatedQuestions);
  };

  // 設問の削除
  const removeSubQuestion = (questionIndex: number, subQuestionIndex: number) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].subQuestions.length > 1) {
      updatedQuestions[questionIndex].subQuestions = updatedQuestions[questionIndex].subQuestions.filter((_, i) => i !== subQuestionIndex);
      // 設問番号を振り直し
      updatedQuestions[questionIndex].subQuestions.forEach((sq, i) => {
        sq.number = `設問${i + 1}`;
      });
      setQuestions(updatedQuestions);
    }
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      // 問題番号を振り直し
      updatedQuestions.forEach((q, i) => {
        q.number = `問${i + 1}`;
      });
      setQuestions(updatedQuestions);
    }
  };

  const createExam = () => {
    if (!examName.trim()) {
      dispatch({ type: 'SET_ERROR', payload: '試験名を入力してください' });
      return;
    }

    if (questions.some(q => !q.caseStudyTitle.trim() || !q.backgroundDescription.trim())) {
      dispatch({ type: 'SET_ERROR', payload: 'すべての問題のケーススタディタイトルと背景説明を入力してください' });
      return;
    }

    if (questions.some(q => q.subQuestions.some(sq => !sq.content.trim()))) {
      dispatch({ type: 'SET_ERROR', payload: 'すべての設問の内容を入力してください' });
      return;
    }

    const examId = `exam_${Date.now()}`;
    const examQuestions: Question[] = questions.map((q, questionIndex) => {
      const questionId = `question_${examId}_${questionIndex + 1}`;
      const subQuestionsWithIds: SubQuestion[] = q.subQuestions.map((sq, subIndex) => ({
        ...sq,
        id: `subquestion_${questionId}_${subIndex + 1}`,
        questionId
      }));

      return {
        ...q,
        id: questionId,
        examId,
        subQuestions: subQuestionsWithIds
      };
    });

    const exam: Exam = {
      id: examId,
      name: examName.trim(),
      description: examDescription.trim(),
      questions: examQuestions,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    dispatch({ type: 'SET_EXAM', payload: exam });
    dispatch({ type: 'SET_ERROR', payload: null });

    // フォームをリセット
    setExamName('');
    setExamDescription('');
    setQuestions([{
      number: '問1',
      caseStudyTitle: '',
      backgroundDescription: '',
      subQuestions: [
        {
          id: '',
          questionId: '',
          number: '設問1',
          content: '',
          intention: '',
          sampleAnswer: '',
          maxScore: 10,
          characterLimit: undefined
        }
      ]
    }]);
  };

  const loadSampleExam = () => {
    try {
      const timestamp = Date.now();
      const examId = `exam_sample_${timestamp}`;

      const sampleExam: Exam = {
        id: examId,
        name: 'IPA PM試験サンプル',
        description: 'プロジェクトマネージャ試験の午後問題サンプル（令和6年度秋期試験形式）',
        questions: [
          {
            id: `question_sample_1_${timestamp}`,
            examId: examId,
            number: '問1',
            caseStudyTitle: '顧客体験価値（UX）を提供するシステム開発プロジェクトに関する事例',
            backgroundDescription: 'P社はレストラン予約のサービス事業を展開しており、サービスを提供するシステムは自社で開発している。サービスの利用者には無償の基本サービスと有償の付加サービスを提供している。付加サービスでは、様々な条件で検索できたり、口コミの投稿・閲覧ができたり、特別メニューを選択できたりする。これまで提供情報の種別・量や検索手段を増やすことで、付加サービスの利用者（以下、ロイヤルユーザーという）を開拓してきた。しかし近年、付加サービスの利用をやめ、ロイヤルユーザーから基本サービスの利用者（以下、無償ユーザーという）に戻る利用者が増えてきた。P社の経営層はこの事態に危機感を抱き、早急に対策をとるために、営業部門のO課長とIT部門のR課長に状況の分析を指示した。',
            subQuestions: [
              {
                id: `subquestion_1_1_${timestamp}`,
                questionId: `question_sample_1_${timestamp}`,
                number: '設問1',
                content: 'R課長が、ヒアリングの対象者を、これまで付加サービスを利用したことがある無償ユーザーではなく、利用したことがない無償ユーザーから選定した狙いを35字以内で答えよ。',
                intention: '要件定義におけるヒアリング対象者の選定理由の理解',
                sampleAnswer: '付加サービスを利用していない無償ユーザーの潜在的なニーズを把握し、UX改善の可能性を探るため。',
                maxScore: 8,
                characterLimit: 35
              },
              {
                id: `subquestion_1_2_${timestamp}`,
                questionId: `question_sample_1_${timestamp}`,
                number: '設問2',
                content: 'R課長は、ヒアリング対象者として、どのような条件を満たす利用者を選定したのか。本文中の□aに入れる適切な利用者を30字以内で答えよ。',
                intention: 'ヒアリング対象者の選定条件の理解',
                sampleAnswer: 'Webサービスを使い慣れていない利用者と、希望に合ったレストランを簡単に探したい利用者',
                maxScore: 8,
                characterLimit: 30
              },
              {
                id: `subquestion_1_3_${timestamp}`,
                questionId: `question_sample_1_${timestamp}`,
                number: '設問3',
                content: 'R課長は、利用時間に関するニーズとして、何の時間に関するニーズを収集したのか。20字以内で答えよ。',
                intention: 'ユーザーニーズ収集における時間要素の理解',
                sampleAnswer: '検索から予約までの合計時間',
                maxScore: 6,
                characterLimit: 20
              },
              {
                id: `subquestion_1_4_${timestamp}`,
                questionId: `question_sample_1_${timestamp}`,
                number: '設問4',
                content: 'R課長は、操作性・視認性がUXに適合するかどうかを、設計段階だけでなく、結合テスト段階でも検証する計画としたのはなぜか。25字以内で答えよ。',
                intention: 'テスト段階でのUX検証の必要性の理解',
                sampleAnswer: '実装内容がUXに適合しているかどうかを実装段階で確認するため',
                maxScore: 8,
                characterLimit: 25
              }
            ]
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      dispatch({ type: 'SET_EXAM', payload: sampleExam });
      dispatch({ type: 'SET_ERROR', payload: null });

      // 現在のフォームの内容をサンプルデータで更新
      setExamName(sampleExam.name);
      setExamDescription(sampleExam.description);
      setQuestions(sampleExam.questions.map(q => ({
        number: q.number,
        caseStudyTitle: q.caseStudyTitle,
        backgroundDescription: q.backgroundDescription,
        subQuestions: q.subQuestions.map(sq => ({
          id: '',
          questionId: '',
          number: sq.number,
          content: sq.content,
          intention: sq.intention,
          sampleAnswer: sq.sampleAnswer,
          maxScore: sq.maxScore,
          characterLimit: sq.characterLimit
        }))
      })));

    } catch (error) {
      console.error('サンプル試験の読み込みに失敗:', error);
      dispatch({ type: 'SET_ERROR', payload: 'サンプル試験の読み込みに失敗しました' });
    }
  };

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>試験設定</h2>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={loadSampleExam}
        >
          サンプル試験を読み込み
        </button>
      </div>

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>基本情報</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              試験名 *
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="例：IPA PM試験 2024年度"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              説明
            </label>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              試験全体の概要を入力してください（問題の詳細は下の「問題設定」で入力）
            </div>
            <textarea
              value={examDescription}
              onChange={(e) => setExamDescription(e.target.value)}
              placeholder="例：プロジェクトマネージャ試験の午後問題サンプル"
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
        </div>
      </div>

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
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>問題設定</h3>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={addQuestion}
          >
            問題を追加
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          {questions.map((question, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '20px',
                marginBottom: '20px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h4 style={{ margin: 0 }}>{question.number}</h4>
                {questions.length > 1 && (
                  <button
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => removeQuestion(index)}
                  >
                    削除
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    ケーススタディタイトル *
                  </label>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
                    問題全体のケースの概要タイトル
                  </div>
                  <input
                    type="text"
                    value={question.caseStudyTitle}
                    onChange={(e) => updateQuestion(index, 'caseStudyTitle', e.target.value)}
                    placeholder="例：顧客体験価値（UX）を提供するシステム開発プロジェクトに関する事例"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    背景説明 *
                  </label>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
                    ケーススタディの詳細な背景・状況説明（長文）
                  </div>
                  <textarea
                    value={question.backgroundDescription}
                    onChange={(e) => updateQuestion(index, 'backgroundDescription', e.target.value)}
                    placeholder="企業の状況、プロジェクトの背景、課題などの詳細説明..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    文字数: {question.backgroundDescription.length}
                  </div>
                </div>

                {/* 設問セクション */}
                <div style={{
                  border: '1px solid #007bff',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f8f9ff'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <h5 style={{ margin: 0, color: '#007bff' }}>設問一覧</h5>
                    <button
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => addSubQuestion(index)}
                    >
                      設問を追加
                    </button>
                  </div>

                  {question.subQuestions.map((subQuestion, subIndex) => (
                    <div
                      key={subIndex}
                      style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        padding: '15px',
                        marginBottom: '10px',
                        backgroundColor: '#fff'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <h6 style={{ margin: 0 }}>{subQuestion.number}</h6>
                        {question.subQuestions.length > 1 && (
                          <button
                            style={{
                              padding: '2px 6px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                            onClick={() => removeSubQuestion(index, subIndex)}
                          >
                            削除
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px', fontWeight: 'bold' }}>
                            設問内容 *
                          </label>
                          <textarea
                            value={subQuestion.content}
                            onChange={(e) => updateSubQuestion(index, subIndex, 'content', e.target.value)}
                            placeholder="設問の具体的な内容を入力"
                            style={{
                              width: '100%',
                              minHeight: '60px',
                              padding: '6px',
                              border: '1px solid #dee2e6',
                              borderRadius: '3px',
                              fontSize: '13px',
                              resize: 'vertical'
                            }}
                          />
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                            文字数: {subQuestion.content.length}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>
                              出題意図
                            </label>
                            <input
                              type="text"
                              value={subQuestion.intention}
                              onChange={(e) => updateSubQuestion(index, subIndex, 'intention', e.target.value)}
                              placeholder="何を評価したいか"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #dee2e6',
                                borderRadius: '3px',
                                fontSize: '13px'
                              }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>
                                配点
                              </label>
                              <input
                                type="number"
                                value={subQuestion.maxScore}
                                onChange={(e) => updateSubQuestion(index, subIndex, 'maxScore', parseInt(e.target.value) || 0)}
                                min="1"
                                max="50"
                                style={{
                                  width: '100%',
                                  padding: '6px',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '3px',
                                  fontSize: '13px'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>
                                文字制限
                              </label>
                              <input
                                type="number"
                                value={subQuestion.characterLimit || ''}
                                onChange={(e) => {
                                const value = e.target.value;
                                updateSubQuestion(index, subIndex, 'characterLimit', value ? parseInt(value) || 0 : 0);
                              }}
                                placeholder="制限なし"
                                min="5"
                                max="200"
                                style={{
                                  width: '100%',
                                  padding: '6px',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '3px',
                                  fontSize: '13px'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>
                            模範解答
                          </label>
                          <textarea
                            value={subQuestion.sampleAnswer}
                            onChange={(e) => updateSubQuestion(index, subIndex, 'sampleAnswer', e.target.value)}
                            placeholder="期待される回答例を入力"
                            style={{
                              width: '100%',
                              minHeight: '50px',
                              padding: '6px',
                              border: '1px solid #dee2e6',
                              borderRadius: '3px',
                              fontSize: '13px',
                              resize: 'vertical'
                            }}
                          />
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                            文字数: {subQuestion.sampleAnswer.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          style={{
            padding: '15px 30px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
          onClick={createExam}
        >
          試験を作成
        </button>
      </div>
    </div>
  );
};

export default ExamSetup;