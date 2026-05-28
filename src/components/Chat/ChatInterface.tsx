import { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useAIProviders } from '../../hooks/useAIProviders';
import { PROVIDER_MODELS } from '../../constants/models';

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('deepseek');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-chat');
  const [customModel, setCustomModel] = useState<string>('');
  const [useCustomModel, setUseCustomModel] = useState<boolean>(false);
  const { providers } = useAIProviders();

  // Listen for progress updates
  useEffect(() => {
    const handleProgress = (data: { conversationId: string; status: string }) => {
      if (data.conversationId === conversationId) {
        setProgressStatus(data.status);
      }
    };

    // @ts-ignore - ai:progress event
    window.electronAPI?.on?.('ai:progress', handleProgress);

    return () => {
      // @ts-ignore
      window.electronAPI?.off?.('ai:progress', handleProgress);
    };
  }, [conversationId]);

  // Update model when provider changes
  useEffect(() => {
    const models = PROVIDER_MODELS[selectedProvider as keyof typeof PROVIDER_MODELS];
    if (models && models.length > 0) {
      setSelectedModel(models[0].id);
    }

    // Load custom model from localStorage
    const savedCustomModel = localStorage.getItem(`customModel_${selectedProvider}`);
    const savedUseCustom = localStorage.getItem(`useCustomModel_${selectedProvider}`) === 'true';

    if (savedCustomModel) {
      setCustomModel(savedCustomModel);
      setUseCustomModel(savedUseCustom);
    } else {
      setUseCustomModel(false);
      setCustomModel('');
    }
  }, [selectedProvider]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        console.log('[ChatInterface] Loading messages for:', conversationId);
        const response = await window.api.ai.getMessages(conversationId);
        if (response.success && response.messages) {
          console.log('[ChatInterface] Loaded messages:', response.messages.length);
          setMessages(response.messages);
        }
      } catch (error) {
        console.error('[ChatInterface] Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [conversationId]);

  const handleSendMessage = async (message: string) => {
    if (!conversationId) return;

    // Save custom model to localStorage when used
    if (useCustomModel && customModel) {
      localStorage.setItem(`customModel_${selectedProvider}`, customModel);
      localStorage.setItem(`useCustomModel_${selectedProvider}`, 'true');
    } else {
      localStorage.setItem(`useCustomModel_${selectedProvider}`, 'false');
    }

    // Check for /research command
    const isResearchMode = message.trim().startsWith('/research');
    const actualMessage = isResearchMode ? message.trim().substring(9).trim() : message;

    console.log('[ChatInterface] Message processing:', {
      original: message,
      isResearchMode,
      actualMessage
    });

    if (isResearchMode && !actualMessage) {
      console.error('[ChatInterface] /research requires a query');
      return;
    }

    setIsSending(true);
    try {
      // Add user message optimistically
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: actualMessage,
        created_at: new Date(),
      };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Call AI with selected provider and model
      const modelToUse = useCustomModel && customModel ? customModel : selectedModel;
      console.log('[ChatInterface] Calling AI:', {
        provider: selectedProvider,
        model: modelToUse,
        researchMode: isResearchMode
      });
      const response = await window.api.ai.chat({
        conversationId,
        messages: updatedMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        providerId: selectedProvider,
        model: modelToUse,
        researchMode: isResearchMode
      });

      console.log('[ChatInterface] AI response:', response);

      if (response.success && response.content) {
        // Reload messages from DB to get saved IDs
        const reloadResponse = await window.api.ai.getMessages(conversationId);
        if (reloadResponse.success && reloadResponse.messages) {
          setMessages(reloadResponse.messages);
        }
      } else {
        console.error('[ChatInterface] AI error:', response.error);
        // Show error message
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: `Error: ${response.error || 'Failed to get response'}`,
          created_at: new Date(),
        };
        setMessages([...updatedMessages, errorMessage]);
      }
    } catch (error) {
      console.error('[ChatInterface] Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="chat-interface flex flex-col h-full bg-background text-foreground">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-secondary">
            <p>Select a conversation or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface flex flex-col h-full bg-background text-foreground">
      {/* Provider and model selector */}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-secondary">Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id.charAt(0).toUpperCase() + p.id.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-secondary">Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={useCustomModel}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm disabled:opacity-50"
            >
              {PROVIDER_MODELS[selectedProvider as keyof typeof PROVIDER_MODELS]?.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomModel}
                onChange={(e) => setUseCustomModel(e.target.checked)}
                className="rounded"
              />
              Custom:
            </label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              disabled={!useCustomModel}
              placeholder="e.g. claude-opus-4-7"
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm disabled:opacity-50 w-48"
            />
          </div>
        </div>
      </div>

      <MessageList messages={messages} isGenerating={isSending} generationStatus={progressStatus} />
      <MessageInput onSend={handleSendMessage} isSending={isSending} />
    </div>
  );
}
