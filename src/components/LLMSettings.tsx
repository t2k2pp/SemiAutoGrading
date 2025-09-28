import React, { useState } from 'react';
import { useSimpleApp } from '../contexts/SimpleAppContext';
import type { LLMConfig, LLMProvider } from '../contexts/SimpleAppContext';

const LLMSettings: React.FC = () => {
  const { state, dispatch } = useSimpleApp();
  const [config, setConfig] = useState<LLMConfig>(state.llmConfig);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const providerConfigs = {
    'lm-studio': {
      name: 'LM Studio',
      description: 'Local LM Studio server with OpenAI-compatible API',
      defaultEndpoint: 'http://127.0.0.1:1234/v1',
      defaultModel: 'gemma-3n-e4b-it-text',
      fields: ['endpoint', 'model'],
    },
    'ollama': {
      name: 'Ollama',
      description: 'Local Ollama server for running LLMs',
      defaultEndpoint: 'http://127.0.0.1:11434',
      defaultModel: 'llama3.2',
      fields: ['ollamaHost', 'model'],
    },
    'azure-openai': {
      name: 'Azure OpenAI',
      description: 'Microsoft Azure OpenAI Service',
      defaultEndpoint: 'https://your-resource.openai.azure.com',
      defaultModel: 'gpt-4',
      fields: ['endpoint', 'apiKey', 'deploymentId', 'apiVersion', 'model'],
    },
    'gemini': {
      name: 'Google Gemini',
      description: 'Google Generative AI (Gemini) API',
      defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.0-flash-exp',
      fields: ['geminiApiKey', 'model'],
    },
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const providerConfig = providerConfigs[provider];
    setConfig({
      ...config,
      provider,
      endpoint: providerConfig.defaultEndpoint,
      model: providerConfig.defaultModel,
      // Reset provider-specific fields
      apiKey: undefined,
      apiVersion: provider === 'azure-openai' ? '2024-10-21' : undefined,
      deploymentId: undefined,
      geminiApiKey: undefined,
      ollamaHost: provider === 'ollama' ? 'http://127.0.0.1:11434' : undefined,
      // 最大トークン数制限も初期化 (デフォルトは有効)
      useMaxTokens: true,
    });
  };

  const handleInputChange = (field: keyof LLMConfig, value: string | number | boolean) => {
    setConfig({ ...config, [field]: value });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult('');

    try {
      let testUrl = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      switch (config.provider) {
        case 'lm-studio':
          testUrl = `${config.endpoint}/models`;
          break;
        case 'ollama':
          testUrl = `${config.ollamaHost || config.endpoint}/api/tags`;
          break;
        case 'azure-openai':
          testUrl = `${config.endpoint}/openai/deployments/${config.deploymentId}/chat/completions?api-version=${config.apiVersion}`;
          if (config.apiKey) {
            headers['api-key'] = config.apiKey;
          }
          break;
        case 'gemini':
          testUrl = `${config.endpoint}/models`;
          if (config.geminiApiKey) {
            headers['x-goog-api-key'] = config.geminiApiKey;
          }
          break;
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        setTestResult('✅ 接続成功！');
      } else {
        setTestResult(`❌ 接続失敗: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ 接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfig = () => {
    dispatch({ type: 'SET_LLM_CONFIG', payload: config });
    setTestResult('✅ 設定を保存しました');
  };

  const renderProviderFields = () => {
    const providerConfig = providerConfigs[config.provider];

    return (
      <div style={{ display: 'grid', gap: '15px' }}>
        {providerConfig.fields.includes('endpoint') && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              エンドポイント URL
            </label>
            <input
              type="text"
              value={config.endpoint}
              onChange={(e) => handleInputChange('endpoint', e.target.value)}
              placeholder={providerConfig.defaultEndpoint}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {providerConfig.fields.includes('apiKey') && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              API キー
            </label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="Azure OpenAI API キーを入力"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {providerConfig.fields.includes('deploymentId') && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              デプロイメント ID
            </label>
            <input
              type="text"
              value={config.deploymentId || ''}
              onChange={(e) => handleInputChange('deploymentId', e.target.value)}
              placeholder="Azure OpenAI デプロイメント名"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {providerConfig.fields.includes('apiVersion') && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              API バージョン
            </label>
            <select
              value={config.apiVersion || '2024-10-21'}
              onChange={(e) => handleInputChange('apiVersion', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="2024-10-21">2024-10-21 (最新GA)</option>
              <option value="2025-04-01-preview">2025-04-01-preview</option>
              <option value="2024-08-01-preview">2024-08-01-preview</option>
            </select>
          </div>
        )}

        {providerConfig.fields.includes('geminiApiKey') && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Gemini API キー
            </label>
            <input
              type="password"
              value={config.geminiApiKey || ''}
              onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
              placeholder="Google AI Studio API キーを入力"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {providerConfig.fields.includes('ollamaHost') && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Ollama ホスト
            </label>
            <input
              type="text"
              value={config.ollamaHost || ''}
              onChange={(e) => handleInputChange('ollamaHost', e.target.value)}
              placeholder="http://127.0.0.1:11434"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            モデル名
          </label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            placeholder={providerConfig.defaultModel}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '40px 5%', width: '100%' }}>
      <h2 style={{ marginBottom: '30px' }}>LLM設定</h2>

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
          <h3 style={{ margin: 0, fontSize: '16px' }}>プロバイダー選択</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gap: '15px' }}>
            {Object.entries(providerConfigs).map(([key, providerConfig]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '15px',
                  border: `2px solid ${config.provider === key ? '#007bff' : '#dee2e6'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: config.provider === key ? '#f8f9ff' : '#fff'
                }}
              >
                <input
                  type="radio"
                  name="provider"
                  value={key}
                  checked={config.provider === key}
                  onChange={() => handleProviderChange(key as LLMProvider)}
                  style={{ marginRight: '12px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {providerConfig.name}
                  </div>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {providerConfig.description}
                  </div>
                </div>
              </label>
            ))}
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
          borderBottom: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            {providerConfigs[config.provider].name} 設定
          </h3>
        </div>
        <div style={{ padding: '20px' }}>
          {renderProviderFields()}
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
          borderBottom: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>生成パラメータ</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Temperature ({config.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  0.0 = 確定的, 2.0 = 創造的
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  タイムアウト (秒)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={Math.round(config.timeout / 1000)}
                  onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) * 1000)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={config.useMaxTokens}
                    onChange={(e) => handleInputChange('useMaxTokens', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  最大トークン数を制限する
                </label>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginLeft: '24px' }}>
                  チェックを外すと無制限（完全なレスポンス優先、コスト・時間は増加）
                </div>
              </div>

              {config.useMaxTokens && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    最大トークン数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4000"
                    value={config.maxTokens}
                    onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    推奨: 採点のみ 200-500、詳細採点 500-1000
                  </div>
                </div>
              )}
            </div>
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
          borderBottom: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>接続テスト</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
            <button
              onClick={testConnection}
              disabled={isTestingConnection}
              style={{
                padding: '10px 20px',
                backgroundColor: isTestingConnection ? '#6c757d' : '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isTestingConnection ? 'not-allowed' : 'pointer'
              }}
            >
              {isTestingConnection ? '接続中...' : '接続テスト'}
            </button>
            <button
              onClick={saveConfig}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              設定を保存
            </button>
          </div>
          {testResult && (
            <div style={{
              padding: '10px',
              backgroundColor: testResult.includes('✅') ? '#d4edda' : '#f8d7da',
              border: `1px solid ${testResult.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {testResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LLMSettings;