import { useState, useEffect } from 'react';
import { useAIProviders, useProviderValidation } from '../../hooks/useAIProviders';
import { Button } from '../ui/Button';
import { Eye, EyeOff, Check, AlertCircle, Trash2, Plus, X } from 'lucide-react';
import { configAPI, aiAPI } from '../../api';
import toast from 'react-hot-toast';

type ProviderId = 'claude' | 'openai' | 'deepseek' | 'custom';

interface HeaderRow {
  name: string;
  value: string;
}

interface ProviderFormState {
  apiKey: string;
  apiKeyPreview: string;
  apiKeysText: string;
  baseURL: string;
  model: string;
  customModel: string;
  useCustomModel: boolean;
  showApiKey: boolean;
  validationStatus: 'idle' | 'validating' | 'success' | 'error';
  validationMessage?: string;
  customHeaders: HeaderRow[];
}

const PROVIDER_MODELS: Record<ProviderId, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  ],
  custom: [
    { value: 'custom-model', label: 'Custom Model' },
  ],
};

const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  claude: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  deepseek: 'https://api.deepseek.com',
  custom: 'https://your-provider.example.com/v1',
};

const PROVIDER_NAMES: Record<ProviderId, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  custom: 'Custom Provider',
};

export function AIProviderSettings() {
  const { providers, setConfig, deleteConfig } = useAIProviders();
  const { validate } = useProviderValidation();
  const [tavilyApiKey, setTavilyApiKey] = useState<string>('');
  const [tavilyConfigured, setTavilyConfigured] = useState<boolean>(false);
  const [tavilyApiKeyPreview, setTavilyApiKeyPreview] = useState<string>('');
  const [showTavilyKey, setShowTavilyKey] = useState<boolean>(false);

  // Initialize form state for each provider
  const [formState, setFormState] = useState<Record<ProviderId, ProviderFormState>>({
    claude: {
      apiKey: '',
      apiKeyPreview: '',
      apiKeysText: '',
      baseURL: '',
      model: PROVIDER_MODELS.claude[0].value,
      customModel: '',
      useCustomModel: false,
      showApiKey: false,
      validationStatus: 'idle',
      customHeaders: [],
    },
    openai: {
      apiKey: '',
      apiKeyPreview: '',
      apiKeysText: '',
      baseURL: '',
      model: PROVIDER_MODELS.openai[0].value,
      customModel: '',
      useCustomModel: false,
      showApiKey: false,
      validationStatus: 'idle',
      customHeaders: [],
    },
    deepseek: {
      apiKey: '',
      apiKeyPreview: '',
      apiKeysText: '',
      baseURL: '',
      model: PROVIDER_MODELS.deepseek[0].value,
      customModel: '',
      useCustomModel: false,
      showApiKey: false,
      validationStatus: 'idle',
      customHeaders: [],
    },
    custom: {
      apiKey: '',
      apiKeyPreview: '',
      apiKeysText: '',
      baseURL: '',
      model: '',
      customModel: '',
      useCustomModel: true,
      showApiKey: false,
      validationStatus: 'idle',
      customHeaders: [],
    },
  });

  // Load existing configs into form state
  useEffect(() => {
    console.log('[AIProviderSettings] Loading providers into form:', providers);

    // Guard against undefined providers
    if (!providers || !Array.isArray(providers)) {
      console.warn('[AIProviderSettings] Providers not loaded yet or invalid format');
      return;
    }

    providers.forEach((config) => {
      console.log('[AIProviderSettings] Loading config:', config.id, 'configured:', config.configured);

      // Load custom model from localStorage
      const savedCustomModel = localStorage.getItem(`customModel_${config.id}`) || '';
      const savedUseCustom = config.id === 'custom' || localStorage.getItem(`useCustomModel_${config.id}`) === 'true';

      setFormState((prev) => ({
        ...prev,
        [config.id]: {
          ...prev[config.id],
          apiKey: '',
          apiKeyPreview: config.apiKeyPreview || '',
          apiKeysText: '',
          baseURL: config.baseURL || '',
          model: config.model || prev[config.id].model,
          customModel: config.id === 'custom' ? (savedCustomModel || config.model || '') : savedCustomModel,
          useCustomModel: savedUseCustom,
          customHeaders: config.customHeaders?.map(header => ({ name: header.name, value: '' })) || prev[config.id].customHeaders,
        },
      }));
    });
  }, [providers]);

  useEffect(() => {
    configAPI.get()
      .then((config) => {
        setTavilyConfigured(!!config.tavilyApiKeyConfigured);
        setTavilyApiKeyPreview(config.tavilyApiKeyPreview || '');
      })
      .catch((error) => console.error('Failed to load Tavily status:', error));
  }, []);

  const handleFieldChange = (
    providerId: ProviderId,
    field: keyof ProviderFormState,
    value: string | boolean
  ) => {
    console.log('[AIProviderSettings] Field change:', {
      providerId,
      field,
      value: field === 'apiKey' ? '[REDACTED]' : value,
    });
    setFormState((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (providerId: ProviderId) => {
    const state = formState[providerId];
    const apiKeys = providerId === 'custom'
      ? state.apiKeysText.split(/\r?\n/).map(key => key.trim()).filter(Boolean)
      : [state.apiKey.trim()].filter(Boolean);
    const apiKey = providerId === 'custom' ? apiKeys[0] : state.apiKey.trim();
    const modelToSave = providerId === 'custom'
      ? (state.customModel || state.model || 'custom-model')
      : state.useCustomModel && state.customModel
        ? state.customModel
        : state.model;

    // Save custom model to localStorage
    if (state.useCustomModel && state.customModel) {
      localStorage.setItem(`customModel_${providerId}`, state.customModel);
      localStorage.setItem(`useCustomModel_${providerId}`, 'true');
    } else {
      localStorage.setItem(`useCustomModel_${providerId}`, 'false');
    }

    // Reset validation status
    setFormState((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        validationStatus: 'validating',
        validationMessage: undefined,
      },
    }));

    try {
      // Validate API key per D-05
      const baseURL = state.baseURL || undefined;
      const result = providerId === 'custom'
        ? { valid: !!apiKey }
        : await validate(providerId, apiKey, baseURL);

      if (result.valid) {
        // Save config to .env via /api/providers
        await setConfig({
          id: providerId,
          apiKey,
          apiKeys,
          baseURL: baseURL,
          model: modelToSave,
          customHeaders: state.customHeaders
            .map(header => ({ name: header.name.trim(), value: header.value.trim() }))
            .filter(header => header.name && header.value),
        });

        setFormState((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            validationStatus: 'success',
            validationMessage: 'Configuration saved successfully',
          },
        }));
      } else {
        setFormState((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            validationStatus: 'error',
            validationMessage: result.error || 'Invalid API key. Please check and try again.',
          },
        }));
      }
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          validationStatus: 'error',
          validationMessage: (error as Error).message || 'Failed to save configuration',
        },
      }));
    }
  };

  const handleDelete = async (providerId: ProviderId) => {
    try {
      await deleteConfig(providerId);
      setFormState((prev) => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          apiKey: '',
          apiKeyPreview: '',
          apiKeysText: '',
          baseURL: '',
          validationStatus: 'idle',
          validationMessage: undefined,
          customHeaders: providerId === 'custom' ? [] : prev[providerId].customHeaders,
        },
      }));
      toast.success(`${PROVIDER_NAMES[providerId]} API key deleted.`);
    } catch (error) {
      console.error('Failed to delete provider config:', error);
      toast.error('Failed to delete provider API key.');
    }
  };

  const handleHeaderChange = (providerId: ProviderId, index: number, field: keyof HeaderRow, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        customHeaders: prev[providerId].customHeaders.map((header, headerIndex) =>
          headerIndex === index ? { ...header, [field]: value } : header
        ),
      },
    }));
  };

  const addHeaderRow = (providerId: ProviderId) => {
    setFormState((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        customHeaders: [...prev[providerId].customHeaders, { name: '', value: '' }],
      },
    }));
  };

  const removeHeaderRow = (providerId: ProviderId, index: number) => {
    setFormState((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        customHeaders: prev[providerId].customHeaders.filter((_, headerIndex) => headerIndex !== index),
      },
    }));
  };

  const handleSaveTavily = async () => {
    try {
      // Save to data/.env via backend API
      await configAPI.update({ tavilyApiKey });
      setTavilyConfigured(!!tavilyApiKey);
      setTavilyApiKeyPreview(
        tavilyApiKey ? `${tavilyApiKey.slice(0, 5)}...${tavilyApiKey.slice(-5)}` : ''
      );
      setTavilyApiKey('');
      toast.success('Tavily API key saved successfully.');
    } catch (error) {
      console.error('Failed to save Tavily key:', error);
      toast.error('Failed to save Tavily key. Check console for details.');
    }
  };

  const renderProviderSection = (providerId: ProviderId) => {
    const state = formState[providerId];
    const providerName = PROVIDER_NAMES[providerId];
    const models = PROVIDER_MODELS[providerId];
    const defaultBaseURL = DEFAULT_BASE_URLS[providerId];

    return (
      <div key={providerId} className="border border-border rounded-lg p-6 bg-background">
        <h3 className="text-lg font-semibold text-foreground mb-4">{providerName}</h3>

        <div className="space-y-4">
          {/* API Key Input */}
          {providerId === 'custom' ? (
            <div>
              <label htmlFor={`${providerId}-apiKeys`} className="block text-sm font-medium text-foreground mb-1">
                API Keys
              </label>
              <textarea
                id={`${providerId}-apiKeys`}
                value={state.apiKeysText}
                onChange={(e) => handleFieldChange(providerId, 'apiKeysText', e.target.value)}
                className="min-h-24 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                placeholder="One API key per line"
              />
              {state.apiKeyPreview && (
                <p className="mt-1 text-xs text-secondary">Configured key: {state.apiKeyPreview}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor={`${providerId}-apiKey`} className="block text-sm font-medium text-foreground mb-1">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  id={`${providerId}-apiKey`}
                  type={state.showApiKey ? 'text' : 'password'}
                  value={state.apiKey}
                  onChange={(e) => handleFieldChange(providerId, 'apiKey', e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="Enter API key"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldChange(providerId, 'showApiKey', !state.showApiKey)}
                  aria-label={state.showApiKey ? 'Hide API key' : 'Reveal API key'}
                >
                  {state.showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {state.apiKeyPreview && (
                <p className="text-xs text-secondary mt-1">Configured key: {state.apiKeyPreview}</p>
              )}
            </div>
          )}

          {/* Base URL Input */}
          <div>
            <label htmlFor={`${providerId}-baseURL`} className="block text-sm font-medium text-foreground mb-1">
              Base URL (optional)
            </label>
            <input
              id={`${providerId}-baseURL`}
              type="text"
              value={state.baseURL}
              onChange={(e) => handleFieldChange(providerId, 'baseURL', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder={defaultBaseURL}
            />
          </div>

          {/* Model Selection */}
          {providerId !== 'custom' && <div>
            <label htmlFor={`${providerId}-model`} className="block text-sm font-medium text-foreground mb-1">
              Model ({providerName})
            </label>
            <select
              id={`${providerId}-model`}
              value={state.model}
              onChange={(e) => handleFieldChange(providerId, 'model', e.target.value)}
              disabled={state.useCustomModel}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>}

          {/* Custom Model */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
              <input
                type="checkbox"
                checked={state.useCustomModel}
                onChange={(e) => handleFieldChange(providerId, 'useCustomModel', e.target.checked)}
                className="rounded"
              />
              Use Custom Model
            </label>
            <input
              type="text"
              value={state.customModel}
              onChange={(e) => handleFieldChange(providerId, 'customModel', e.target.value)}
              disabled={!state.useCustomModel}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
              placeholder="e.g., claude-opus-4-7"
            />
          </div>

          {providerId === 'custom' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">Custom Headers</label>
                <Button variant="outline" size="sm" onClick={() => addHeaderRow(providerId)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Header
                </Button>
              </div>
              {state.customHeaders.length === 0 ? (
                <p className="text-xs text-secondary">No custom headers configured.</p>
              ) : (
                <div className="space-y-2">
                  {state.customHeaders.map((header, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        value={header.name}
                        onChange={(event) => handleHeaderChange(providerId, index, 'name', event.target.value)}
                        className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Header name"
                      />
                      <input
                        value={header.value}
                        onChange={(event) => handleHeaderChange(providerId, index, 'value', event.target.value)}
                        className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Header value"
                      />
                      <Button variant="outline" size="sm" onClick={() => removeHeaderRow(providerId, index)} aria-label="Remove header">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Status */}
          {state.validationStatus !== 'idle' && (
            <div className="flex items-center gap-2 text-sm">
              {state.validationStatus === 'validating' && (
                <span className="text-secondary">Validating...</span>
              )}
              {state.validationStatus === 'success' && (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">{state.validationMessage}</span>
                </>
              )}
              {state.validationStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{state.validationMessage}</span>
                </>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleSave(providerId)}
              disabled={
                (providerId === 'custom'
                  ? !state.apiKeysText.trim()
                  : !state.apiKey) ||
                state.validationStatus === 'validating'
              }
            >
              Save
            </Button>
            {state.apiKeyPreview && (
              <Button variant="outline" onClick={() => handleDelete(providerId)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete Key
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Security Warning per D-27 */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Security Notice:</strong> API keys are encrypted but stored locally. Keep your machine secure.
        </p>
      </div>

      {/* Tavily Web Search API Key */}
      <div className="border border-border rounded-lg p-6 bg-background">
        <h3 className="text-lg font-semibold text-foreground mb-2">Tavily Web Search (Optional)</h3>
        <p className="text-sm text-secondary mb-4">
          Configure Tavily API for high-quality web search. Without it, providers will use their own search (if available).
          Get free API key at <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">tavily.com</a>
        </p>
        {tavilyConfigured && (
          <p className="text-sm text-green-600 mb-4">
            Tavily API key is configured: {tavilyApiKeyPreview}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="tavily-apiKey" className="block text-sm font-medium text-foreground mb-1">
              Tavily API Key
            </label>
            <div className="flex gap-2">
              <input
                id="tavily-apiKey"
                type={showTavilyKey ? 'text' : 'password'}
                value={tavilyApiKey}
                onChange={(e) => setTavilyApiKey(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="tvly-..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTavilyKey(!showTavilyKey)}
                aria-label={showTavilyKey ? 'Hide API key' : 'Reveal API key'}
              >
                {showTavilyKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={handleSaveTavily}>
            Save Tavily Key
          </Button>
        </div>
      </div>

      {/* Provider Sections */}
      {renderProviderSection('claude')}
      {renderProviderSection('openai')}
      {renderProviderSection('deepseek')}
      {renderProviderSection('custom')}
    </div>
  );
}
