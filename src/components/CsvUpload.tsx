import React, { useState, useRef } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import { csvService } from '../services/csvService';

const CsvUpload: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    if (!state.currentExam) {
      dispatch({
        type: 'SET_ERROR',
        payload: '試験が選択されていません。まず試験を設定してください。'
      });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      setUploadProgress('ファイルを読み込み中...');

      const answers = await csvService.parseAnswersFromCsv(file, state.currentExam);

      setUploadProgress('データを検証中...');
      await new Promise(resolve => setTimeout(resolve, 500));

      dispatch({ type: 'SET_ANSWERS', payload: answers });
      setUploadProgress(`${answers.length}件の回答データを読み込みました`);

      setTimeout(() => {
        setUploadProgress('');
      }, 2000);

    } catch (error) {
      console.error('CSV読み込みエラー:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'CSV読み込みに失敗しました'
      });
      setUploadProgress('');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      handleFileSelect(file);
    } else {
      dispatch({
        type: 'SET_ERROR',
        payload: 'CSVファイルを選択してください'
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const renderCurrentData = () => {
    if (state.answers.length === 0) return null;

    return (
      <div style={{
        marginTop: '30px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>読み込み済みデータ</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>回答数</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{state.answers.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>学生数</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {new Set(state.answers.map(a => a.studentId)).size}
            </div>
          </div>
        </div>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => dispatch({ type: 'SET_ANSWERS', payload: [] })}
        >
          データをクリア
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <h2 style={{ marginBottom: '30px' }}>CSV回答データの読み込み</h2>

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
            CSV読み込みを行う前に、まず試験設定で試験を作成・選択してください。
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>現在の試験</h3>
          <p style={{ margin: 0, color: '#155724' }}>
            {state.currentExam.name} ({state.currentExam.questions.length}問)
          </p>
        </div>
      )}

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
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>CSVファイルの形式</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
            以下の列を含むCSVファイルをアップロードしてください：
          </p>
          <div style={{
            backgroundColor: '#f1f3f4',
            borderRadius: '4px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            student_id, question_number, answer_content
          </div>
        </div>

        <div style={{ padding: '30px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={!state.currentExam}
          />

          <div
            style={{
              border: `2px dashed ${isDragOver ? '#007bff' : '#dee2e6'}`,
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: isDragOver ? '#f8f9ff' : '#fafafa',
              cursor: state.currentExam ? 'pointer' : 'not-allowed',
              opacity: state.currentExam ? 1 : 0.6,
              transition: 'all 0.2s ease'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={state.currentExam ? handleButtonClick : undefined}
          >
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
              CSVファイルをドラッグ＆ドロップ
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>
              または
            </p>
            <button
              style={{
                padding: '12px 24px',
                backgroundColor: state.currentExam ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: state.currentExam ? 'pointer' : 'not-allowed',
                fontSize: '16px'
              }}
              onClick={handleButtonClick}
              disabled={!state.currentExam}
            >
              ファイルを選択
            </button>
          </div>

          {uploadProgress && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#0066cc'
            }}>
              {uploadProgress}
            </div>
          )}
        </div>
      </div>

      {renderCurrentData()}
    </div>
  );
};

export default CsvUpload;