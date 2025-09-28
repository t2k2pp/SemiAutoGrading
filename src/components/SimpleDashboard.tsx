import React, { useState } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import CsvUpload from './CsvUpload';
import FirstGrading from './FirstGrading';
import SecondGrading from './SecondGrading';
import ExportResults from './ExportResults';
import ExamSetup from './ExamSetup';
import LLMSettings from './LLMSettings';

type DashboardView = 'home' | 'exam-setup' | 'csv-upload' | 'first-grading' | 'second-grading' | 'export' | 'llm-settings';

const SimpleDashboard: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const [currentView, setCurrentView] = useState<DashboardView>('home');

  const renderNavigation = () => (
    <nav style={{
      display: 'flex',
      backgroundColor: '#fff',
      borderBottom: '1px solid #ddd',
      padding: '0 20px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'home' ? '#007bff' : 'none',
          color: currentView === 'home' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'home' ? '3px solid #007bff' : '3px solid transparent'
        }}
        onClick={() => setCurrentView('home')}
      >
        ホーム
      </button>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'exam-setup' ? '#007bff' : 'none',
          color: currentView === 'exam-setup' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'exam-setup' ? '3px solid #007bff' : '3px solid transparent'
        }}
        onClick={() => setCurrentView('exam-setup')}
      >
        試験設定
      </button>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'csv-upload' ? '#007bff' : 'none',
          color: currentView === 'csv-upload' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'csv-upload' ? '3px solid #007bff' : '3px solid transparent'
        }}
        onClick={() => setCurrentView('csv-upload')}
      >
        CSV読み込み
      </button>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'first-grading' ? '#007bff' : 'none',
          color: currentView === 'first-grading' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'first-grading' ? '3px solid #007bff' : '3px solid transparent'
        }}
        onClick={() => setCurrentView('first-grading')}
        disabled={!state.currentExam || state.answers.length === 0}
      >
        一次採点
      </button>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'second-grading' ? '#007bff' : 'none',
          color: currentView === 'second-grading' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'second-grading' ? '3px solid #007bff' : '3px solid transparent',
          opacity: (!state.currentExam || state.answers.length === 0) ? 0.6 : 1
        }}
        onClick={() => setCurrentView('second-grading')}
        disabled={!state.currentExam || state.answers.length === 0}
      >
        二次採点
      </button>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'export' ? '#007bff' : 'none',
          color: currentView === 'export' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'export' ? '3px solid #007bff' : '3px solid transparent',
          opacity: state.gradingResults.length === 0 ? 0.6 : 1
        }}
        onClick={() => setCurrentView('export')}
        disabled={state.gradingResults.length === 0}
      >
        エクスポート
      </button>
      <button
        style={{
          padding: '15px 20px',
          border: 'none',
          background: currentView === 'llm-settings' ? '#007bff' : 'none',
          color: currentView === 'llm-settings' ? 'white' : '#666',
          cursor: 'pointer',
          borderBottom: currentView === 'llm-settings' ? '3px solid #007bff' : '3px solid transparent'
        }}
        onClick={() => setCurrentView('llm-settings')}
      >
        LLM設定
      </button>
    </nav>
  );

  const renderHomeView = () => (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <section style={{
        marginBottom: '40px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <h2 style={{
          padding: '20px',
          margin: '0',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          fontSize: '18px'
        }}>
          現在の試験
        </h2>
        {state.currentExam ? (
          <div style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{state.currentExam.name}</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>{state.currentExam.description}</p>
            <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>問題数</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{state.currentExam.questions.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>回答数</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{state.answers.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>採点済み</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{state.gradingResults.length}</div>
              </div>
            </div>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => dispatch({ type: 'CLEAR_DATA' })}
            >
              試験をクリア
            </button>
          </div>
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
            <p>試験が選択されていません</p>
            <p>「試験設定」から新しい試験を作成してください</p>
          </div>
        )}
      </section>

      <section style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <h2 style={{
          padding: '20px',
          margin: '0',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          fontSize: '18px'
        }}>
          クイックアクション
        </h2>
        <div style={{ display: 'flex', gap: '15px', padding: '20px', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '12px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onClick={() => setCurrentView('exam-setup')}
          >
            新しい試験を作成
          </button>
          {state.currentExam && (
            <button
              style={{
                padding: '12px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={() => setCurrentView('csv-upload')}
            >
              回答データをアップロード
            </button>
          )}
          {state.answers.length > 0 && (
            <button
              style={{
                padding: '12px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={() => setCurrentView('first-grading')}
            >
              一次採点を開始
            </button>
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
        return <ExamSetup />;
      case 'csv-upload':
        return <CsvUpload />;
      case 'first-grading':
        return <FirstGrading />;
      case 'second-grading':
        return <SecondGrading />;
      case 'export':
        return <ExportResults />;
      case 'llm-settings':
        return <LLMSettings />;
      default:
        return renderHomeView();
    }
  };

  if (state.error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
        <h2 style={{ color: '#dc3545' }}>エラーが発生しました</h2>
        <p>{state.error}</p>
        <button
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
        >
          エラーを閉じる
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {renderNavigation()}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {state.isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <p>処理中...</p>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default SimpleDashboard;