import React, { useState, useEffect } from 'react';
import { useApp, type Exam } from '../../contexts/AppContext';
import { dataService } from '../../services/dataService';
import './Dashboard.css';

type DashboardView = 'home' | 'exam-setup' | 'csv-upload' | 'first-grading' | 'second-grading' | 'export';

const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAvailableExams();
  }, []);

  const loadAvailableExams = async () => {
    try {
      setIsLoading(true);
      const exams = await dataService.getAllExams();
      setAvailableExams(exams);
    } catch (error) {
      console.error('試験データの読み込みに失敗:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: '試験データの読み込みに失敗しました'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamSelect = async (examId: string) => {
    try {
      setIsLoading(true);
      const exam = await dataService.getExam(examId);
      if (exam) {
        dispatch({ type: 'SET_EXAM', payload: exam });

        // 回答データも読み込み
        const answers = await dataService.getAnswersByExamId(examId);
        dispatch({ type: 'SET_ANSWERS', payload: answers });
      }
    } catch (error) {
      console.error('試験選択エラー:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: '試験の選択に失敗しました'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderNavigation = () => (
    <nav className="dashboard-nav">
      <button
        className={currentView === 'home' ? 'active' : ''}
        onClick={() => setCurrentView('home')}
      >
        ホーム
      </button>
      <button
        className={currentView === 'exam-setup' ? 'active' : ''}
        onClick={() => setCurrentView('exam-setup')}
        disabled={!state.currentExam}
      >
        試験設定
      </button>
      <button
        className={currentView === 'csv-upload' ? 'active' : ''}
        onClick={() => setCurrentView('csv-upload')}
        disabled={!state.currentExam}
      >
        CSV読み込み
      </button>
      <button
        className={currentView === 'first-grading' ? 'active' : ''}
        onClick={() => setCurrentView('first-grading')}
        disabled={!state.currentExam || state.answers.length === 0}
      >
        一次採点
      </button>
      <button
        className={currentView === 'second-grading' ? 'active' : ''}
        onClick={() => setCurrentView('second-grading')}
        disabled={!state.currentExam || state.answers.length === 0}
      >
        二次採点
      </button>
      <button
        className={currentView === 'export' ? 'active' : ''}
        onClick={() => setCurrentView('export')}
        disabled={!state.currentExam || state.gradingResults.length === 0}
      >
        エクスポート
      </button>
    </nav>
  );

  const renderHomeView = () => (
    <div className="dashboard-home">
      <section className="current-exam-section">
        <h2>現在の試験</h2>
        {state.currentExam ? (
          <div className="current-exam-card">
            <h3>{state.currentExam.name}</h3>
            <p>{state.currentExam.description}</p>
            <div className="exam-stats">
              <div className="stat">
                <span className="stat-label">問題数:</span>
                <span className="stat-value">{state.currentExam.questions.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">回答数:</span>
                <span className="stat-value">{state.answers.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">採点済み:</span>
                <span className="stat-value">{state.gradingResults.length}</span>
              </div>
            </div>
            <button
              className="clear-exam-btn"
              onClick={() => dispatch({ type: 'CLEAR_DATA' })}
            >
              試験をクリア
            </button>
          </div>
        ) : (
          <div className="no-exam-message">
            <p>試験が選択されていません</p>
            <p>下記から既存の試験を選択するか、新しい試験を作成してください</p>
          </div>
        )}
      </section>

      <section className="available-exams-section">
        <h2>利用可能な試験</h2>
        {isLoading ? (
          <p>読み込み中...</p>
        ) : availableExams.length === 0 ? (
          <div className="no-exams-message">
            <p>利用可能な試験がありません</p>
            <button
              className="create-exam-btn"
              onClick={() => setCurrentView('exam-setup')}
            >
              新しい試験を作成
            </button>
          </div>
        ) : (
          <div className="exams-grid">
            {availableExams.map(exam => (
              <div
                key={exam.id}
                className={`exam-card ${state.currentExam?.id === exam.id ? 'selected' : ''}`}
                onClick={() => handleExamSelect(exam.id)}
              >
                <h3>{exam.name}</h3>
                <p>{exam.description}</p>
                <div className="exam-meta">
                  <small>問題数: {exam.questions.length}</small>
                  <small>作成日: {new Date(exam.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="quick-actions-section">
        <h2>クイックアクション</h2>
        <div className="quick-actions">
          <button
            className="action-btn"
            onClick={() => setCurrentView('exam-setup')}
          >
            新しい試験を作成
          </button>
          {state.currentExam && (
            <>
              <button
                className="action-btn"
                onClick={() => setCurrentView('csv-upload')}
              >
                回答データをアップロード
              </button>
              {state.answers.length > 0 && (
                <button
                  className="action-btn"
                  onClick={() => setCurrentView('first-grading')}
                >
                  一次採点を開始
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return renderHomeView();
      case 'exam-setup':
        return <div className="view-placeholder">試験設定画面（実装予定）</div>;
      case 'csv-upload':
        return <div className="view-placeholder">CSV読み込み画面（実装予定）</div>;
      case 'first-grading':
        return <div className="view-placeholder">一次採点画面（実装予定）</div>;
      case 'second-grading':
        return <div className="view-placeholder">二次採点画面（実装予定）</div>;
      case 'export':
        return <div className="view-placeholder">エクスポート画面（実装予定）</div>;
      default:
        return renderHomeView();
    }
  };

  if (state.error) {
    return (
      <div className="dashboard-error">
        <h2>エラーが発生しました</h2>
        <p>{state.error}</p>
        <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}>
          エラーを閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {renderNavigation()}
      <div className="dashboard-content">
        {state.isLoading && (
          <div className="loading-overlay">
            <p>処理中...</p>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;