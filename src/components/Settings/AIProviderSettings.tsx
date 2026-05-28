import { useState, useEffect } from 'react';
import { useAIProviders, useProviderValidation } from '../../hooks/useAIProviders';
import { Button } from '../ui/Button';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

type ProviderId = 'claude' | 'openai' | 'deepseek';

interface ProviderFormState {
  apiKey: string;
  baseURL: string;
  model: string;
  customModel: string;
  useCustomModel: boolean;
  showApiKey: boolean;
  validationStatus: 'idle' | 'validating' | 'success' | 'error';
  validationMessage?: string;
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
};

const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  claude: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  deepseek: 'https://api.deepseek.com',
};

const PROVIDER_NAMES: Record<ProviderId, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

export function AIProviderSettings() {
  const { providers, setConfig } = useAIProviders();
  const { validate } = useProviderValidation();
  const [tavilyApiKey, setTavilyApiKey] = useState<string>('');
  const [showTavilyKey, setShowTavilyKey] = useState<boolean>(false);

  // Initialize form state for each provider
  const [formState, setFormState] = useState<Record<ProviderId, ProviderFormState>>({
    claude: {
      apiKey: '',
      baseURL: '',
      model: PROVIDER_MODELS.claude[0].value,
      customModel: '',
      useCustomModel: false,
      showApiKey: false,
      validationStatus: 'idle',
    },
    openai: {
      apiKey: '',
      baseURL: '',
      model: PROVIDER_MODELS.openai[0].value,
      customModel: '',
      useCustomModel: false,
      showApiKey: false,
      validationStatus: 'idle',
    },
    deepseek: {
      apiKey: '',
      baseURL: '',
      model: PROVIDER_MODELS.deepseek[0].value,
      customModel: '',
      useCustomModel: false,
      showApiKey: false,
      validationStatus: 'idle',
    },
  });

  // Load existing configs into form state
  useEffect(() => {
    console.log('[AIProviderSettings] Loading providers into form:', providers);

    // Load Tavily key from localStorage
    const savedTavilyKey = localStorage.getItem('tavilyApiKey') || '';
    setTavilyApiKey(savedTavilyKey);

    providers.forEach((config) => {
      console.log('[AIProviderSettings] Loading config:', config.id, 'apiKey length:', config.apiKey?.length);

      // Load custom model from localStorage
      const savedCustomModel = localStorage.getItem(`customModel_${config.id}`) || '';
      const savedUseCustom = localStorage.getItem(`useCustomModel_${config.id}`) === 'true';

      setFormState((prev) => ({
        ...prev,
        [config.id]: {
          ...prev[config.id],
          apiKey: config.apiKey,
          baseURL: config.baseURL || '',
          model: config.model,
          customModel: savedCustomModel,
          useCustomModel: savedUseCustom,
        },
      }));
    });
  }, [providers]);

  const handleFieldChange = (
    providerId: ProviderId,
    field: keyof ProviderFormState,
    value: string | boolean
  ) => {
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
      const result = await validate(providerId, state.apiKey, baseURL);

      if (result.valid) {
        // Save config
        const modelToSave = state.useCustomModel && state.customModel ? state.customModel : state.model;
        await setConfig({
          id: providerId,
          apiKey: state.apiKey,
          baseURL: baseURL,
          model: modelToSave,
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

  const handleSaveTavily = () => {
    localStorage.setItem('tavilyApiKey', tavilyApiKey);
    // Also save to .env via IPC if needed
    alert('Tavily API key saved to localStorage. Restart app to use in backend.');
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
          </div>

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
          <div>
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
          </div>

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
          <Button
            onClick={() => handleSave(providerId)}
            disabled={!state.apiKey || state.validationStatus === 'validating'}
          >
            Save
          </Button>
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
    </div>
  );
}
