import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIProviderSettings } from '../src/components/Settings/AIProviderSettings';
import * as useAIProvidersHook from '../src/hooks/useAIProviders';

// Mock the hooks
vi.mock('../src/hooks/useAIProviders');

describe('AIProviderSettings', () => {
  const mockSetConfig = vi.fn();
  const mockDeleteConfig = vi.fn();
  const mockValidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAIProviders
    vi.mocked(useAIProvidersHook.useAIProviders).mockReturnValue({
      providers: [],
      loading: false,
      error: null,
      setConfig: mockSetConfig,
      deleteConfig: mockDeleteConfig,
      refetch: vi.fn(),
    });

    // Mock useProviderValidation
    vi.mocked(useAIProvidersHook.useProviderValidation).mockReturnValue({
      validate: mockValidate,
      validating: false,
      validationResult: null,
    });
  });

  it('Test 1: Component renders three provider sections (Claude, OpenAI, DeepSeek)', () => {
    render(<AIProviderSettings />);

    expect(screen.getByRole('heading', { name: /Claude/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /OpenAI/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /DeepSeek/i })).toBeInTheDocument();
  });

  it('Test 2: API key input is masked by default per D-25', () => {
    render(<AIProviderSettings />);

    const apiKeyInputs = screen.getAllByLabelText(/^API Key$/i);
    apiKeyInputs.forEach((input) => {
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  it('Test 3: Reveal button toggles API key visibility per D-25', () => {
    render(<AIProviderSettings />);

    const apiKeyInputs = screen.getAllByLabelText(/API Key/i);
    const revealButtons = screen.getAllByRole('button', { name: /reveal/i });

    // Initially masked
    expect(apiKeyInputs[0]).toHaveAttribute('type', 'password');

    // Click reveal button
    fireEvent.click(revealButtons[0]);

    // Should be visible
    expect(apiKeyInputs[0]).toHaveAttribute('type', 'text');

    // Click again to hide
    fireEvent.click(revealButtons[0]);

    // Should be masked again
    expect(apiKeyInputs[0]).toHaveAttribute('type', 'password');
  });

  it('Test 4: Model dropdown shows hardcoded models per D-22', () => {
    render(<AIProviderSettings />);

    // Claude models
    const claudeModelSelect = screen.getByLabelText(/Model.*Claude/i);
    expect(claudeModelSelect).toBeInTheDocument();

    // Check Claude options exist
    const claudeOptions = screen.getAllByRole('option');
    expect(claudeOptions.some(opt => opt.textContent?.includes('Claude 3.5 Sonnet'))).toBe(true);
    expect(claudeOptions.some(opt => opt.textContent?.includes('Claude 3 Opus'))).toBe(true);
    expect(claudeOptions.some(opt => opt.textContent?.includes('Claude 3 Haiku'))).toBe(true);

    // OpenAI models
    const openaiModelSelect = screen.getByLabelText(/Model.*OpenAI/i);
    expect(openaiModelSelect).toBeInTheDocument();
    expect(claudeOptions.some(opt => opt.textContent?.includes('GPT-4') && opt.textContent?.length < 10)).toBe(true);
    expect(claudeOptions.some(opt => opt.textContent?.includes('GPT-4o'))).toBe(true);

    // DeepSeek models
    const deepseekModelSelect = screen.getByLabelText(/Model.*DeepSeek/i);
    expect(deepseekModelSelect).toBeInTheDocument();
    expect(claudeOptions.some(opt => opt.textContent?.includes('DeepSeek Chat'))).toBe(true);
    expect(claudeOptions.some(opt => opt.textContent?.includes('DeepSeek Coder'))).toBe(true);
  });

  it('Test 5: Custom base URL input is optional per D-03', () => {
    render(<AIProviderSettings />);

    const baseURLInputs = screen.getAllByLabelText(/Base URL/i);
    baseURLInputs.forEach((input) => {
      expect(input).not.toBeRequired();
      expect(input).toHaveAttribute('placeholder');
    });
  });

  it('Test 6: Save button validates API key before saving per D-05', async () => {
    mockValidate.mockResolvedValue({ valid: true });
    mockSetConfig.mockResolvedValue(undefined);

    render(<AIProviderSettings />);

    // Fill in Claude provider
    const apiKeyInput = screen.getAllByLabelText(/^API Key$/i)[0];
    const modelSelect = screen.getByLabelText(/Model.*Claude/i);
    const saveButton = screen.getAllByRole('button', { name: /^Save$/i })[0];

    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
    fireEvent.change(modelSelect, { target: { value: 'claude-3-5-sonnet-20241022' } });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith('claude', 'test-api-key', undefined);
    });

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith({
        id: 'claude',
        apiKey: 'test-api-key',
        model: 'claude-3-5-sonnet-20241022',
      });
    });
  });

  it('Test 7: Security warning displayed per D-27', () => {
    render(<AIProviderSettings />);

    expect(
      screen.getByText(/API keys are encrypted but stored locally/i)
    ).toBeInTheDocument();
  });

  it('Test 8: Validation success shows checkmark, failure shows error message', async () => {
    // Test success
    const mockValidateSuccess = vi.fn().mockResolvedValue({ valid: true });

    vi.mocked(useAIProvidersHook.useProviderValidation).mockReturnValue({
      validate: mockValidateSuccess,
      validating: false,
      validationResult: null,
    });

    const { rerender } = render(<AIProviderSettings />);

    const apiKeyInputs = screen.getAllByLabelText(/^API Key$/i);
    const saveButtons = screen.getAllByRole('button', { name: /^Save$/i });

    fireEvent.change(apiKeyInputs[0], { target: { value: 'valid-key' } });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Configuration saved successfully/i)).toBeInTheDocument();
    });

    // Test failure
    vi.clearAllMocks();
    const mockValidateFailure = vi.fn().mockResolvedValue({ valid: false, error: 'Invalid API key' });

    vi.mocked(useAIProvidersHook.useProviderValidation).mockReturnValue({
      validate: mockValidateFailure,
      validating: false,
      validationResult: null,
    });

    rerender(<AIProviderSettings />);

    fireEvent.change(apiKeyInputs[0], { target: { value: 'invalid-key' } });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Invalid API key/i)).toBeInTheDocument();
    });
  });
});
