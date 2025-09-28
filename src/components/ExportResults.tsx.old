import React, { useState } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import { exportService } from '../services/exportService';

type ExportFormat = 'csv' | 'json' | 'html';

const ExportResults: React.FC = () => {
  const { state } = useSimpleApp();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleExport = async () => {
    if (!state.currentExam || state.gradingResults.length === 0) return;

    try {
      setIsExporting(true);
      setExportStatus('エクスポート中...');

      let blob: Blob;
      let filename: string;

      switch (selectedFormat) {
        case 'csv':
          blob = await exportService.exportToCsv(
            state.gradingResults,
            state.answers,
            state.currentExam
          );
          filename = `grading_results_${state.currentExam.name}_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'json':
          blob = await exportService.exportToJson(
            state.gradingResults,
            state.answers,
            state.currentExam
          );
          filename = `grading_results_${state.currentExam.name}_${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'html':
          blob = await exportService.exportToHtml(
            state.gradingResults,
            state.answers,
            state.currentExam
          );
          filename = `grading_results_${state.currentExam.name}_${new Date().toISOString().split('T')[0]}.html`;
          break;

        default:
          throw new Error('サポートされていない形式です');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('エクスポートが完了しました');
      setTimeout(() => setExportStatus(''), 3000);

    } catch (error) {
      console.error('エクスポートエラー:', error);
      setExportStatus('エクスポートに失敗しました');
      setTimeout(() => setExportStatus(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const renderExportStats = () => {
    const totalResults = state.gradingResults.length;
    const completedResults = state.gradingResults.filter(r => r.secondGrade).length;
    const pendingResults = totalResults - completedResults;

    const scoreStats = {
      '○': state.gradingResults.filter(r => (r.secondGrade || r.firstGrade).score === '○').length,
      '△': state.gradingResults.filter(r => (r.secondGrade || r.firstGrade).score === '△').length,
      '×': state.gradingResults.filter(r => (r.secondGrade || r.firstGrade).score === '×').length
    };

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>エクスポート統計</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>総採点数</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{totalResults}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>二次採点完了</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{completedResults}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>要確認</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{pendingResults}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>最終判定分布</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#28a745',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ○
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{scoreStats['○']}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#ffc107',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  △
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{scoreStats['△']}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#dc3545',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ×
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{scoreStats['×']}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFormatSelection = () => (
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>エクスポート形式</h3>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gap: '15px' }}>
          <div
            style={{
              border: `2px solid ${selectedFormat === 'csv' ? '#007bff' : '#dee2e6'}`,
              borderRadius: '8px',
              padding: '15px',
              cursor: 'pointer',
              backgroundColor: selectedFormat === 'csv' ? '#f8f9ff' : 'white'
            }}
            onClick={() => setSelectedFormat('csv')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input
                type="radio"
                checked={selectedFormat === 'csv'}
                onChange={() => setSelectedFormat('csv')}
                style={{ margin: 0 }}
              />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>CSV形式</div>
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginLeft: '25px' }}>
              表計算ソフト（Excel、Google Sheets等）で開くことができる形式。データ分析に適しています。
            </div>
          </div>

          <div
            style={{
              border: `2px solid ${selectedFormat === 'json' ? '#007bff' : '#dee2e6'}`,
              borderRadius: '8px',
              padding: '15px',
              cursor: 'pointer',
              backgroundColor: selectedFormat === 'json' ? '#f8f9ff' : 'white'
            }}
            onClick={() => setSelectedFormat('json')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input
                type="radio"
                checked={selectedFormat === 'json'}
                onChange={() => setSelectedFormat('json')}
                style={{ margin: 0 }}
              />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>JSON形式</div>
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginLeft: '25px' }}>
              プログラムでの処理やデータ交換に適した構造化データ形式。すべての詳細情報が含まれます。
            </div>
          </div>

          <div
            style={{
              border: `2px solid ${selectedFormat === 'html' ? '#007bff' : '#dee2e6'}`,
              borderRadius: '8px',
              padding: '15px',
              cursor: 'pointer',
              backgroundColor: selectedFormat === 'html' ? '#f8f9ff' : 'white'
            }}
            onClick={() => setSelectedFormat('html')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input
                type="radio"
                checked={selectedFormat === 'html'}
                onChange={() => setSelectedFormat('html')}
                style={{ margin: 0 }}
              />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>HTML形式</div>
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginLeft: '25px' }}>
              ブラウザで表示可能な見やすいレポート形式。印刷や共有に適しています。
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            style={{
              padding: '15px 30px',
              backgroundColor: state.gradingResults.length > 0 && !isExporting ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: state.gradingResults.length > 0 && !isExporting ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
            onClick={handleExport}
            disabled={state.gradingResults.length === 0 || isExporting}
          >
            {isExporting ? 'エクスポート中...' : 'エクスポート開始'}
          </button>
        </div>

        {exportStatus && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: exportStatus.includes('失敗') ? '#f8d7da' : '#d4edda',
            border: `1px solid ${exportStatus.includes('失敗') ? '#f5c6cb' : '#c3e6cb'}`,
            borderRadius: '4px',
            textAlign: 'center',
            color: exportStatus.includes('失敗') ? '#721c24' : '#155724'
          }}>
            {exportStatus}
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewSample = () => {
    if (state.gradingResults.length === 0) return null;

    const sampleResult = state.gradingResults[0];
    const sampleAnswer = state.answers.find(a => a.id === sampleResult.answerId);
    const sampleQuestion = state.currentExam?.questions.find(q => q.id === sampleAnswer?.questionId);

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>データプレビュー（サンプル）</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>学生ID:</span>
              <span>{sampleAnswer?.studentId}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>問題番号:</span>
              <span>問{sampleQuestion?.number}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>一次採点:</span>
              <span>{sampleResult.firstGrade.score} ({sampleResult.firstGrade.points}点)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>最終判定:</span>
              <span>
                {sampleResult.secondGrade ?
                  `${sampleResult.secondGrade.score} (${sampleResult.secondGrade.points}点)` :
                  '未完了'
                }
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>採点理由:</span>
              <span style={{ fontSize: '12px' }}>
                {(sampleResult.secondGrade || sampleResult.firstGrade).reason}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!state.currentExam) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>エクスポート</h2>
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
        <h2>エクスポート</h2>
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            採点結果がありません。まず一次採点を実行してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <h2 style={{ marginBottom: '30px' }}>採点結果エクスポート</h2>

      {renderExportStats()}
      {renderFormatSelection()}
      {renderPreviewSample()}
    </div>
  );
};

export default ExportResults;