import { useState } from 'react';
import { useConversations } from '../hooks/useConversations';
import { ChatInterface } from '../components/Chat/ChatInterface';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';

export function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { conversations, loading, error, refetch } = useConversations();

  const handleNewConversation = async () => {
    try {
      const newConversation = await window.api.conversation.create({
        title: 'New Conversation',
      });
      setSelectedConversationId(newConversation.id);
      refetch();
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  return (
    <div className="chat-layout flex h-screen">
      {/* Conversation list sidebar (left) */}
      <aside className="conversation-sidebar w-64 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
          </div>
          <Button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2"
            size="sm"
          >
            <Plus size={16} />
            New Conversation
          </Button>
        </div>

        <div className="conversation-list">
          {loading && (
            <div className="p-4 text-center text-secondary">
              Loading conversations...
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-destructive">
              Error loading conversations
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div className="p-4 text-center text-secondary">
              <p className="text-sm">No conversations yet. Start a new one!</p>
            </div>
          )}

          {!loading && !error && conversations.length > 0 && (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedConversationId === conversation.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main chat area (center) */}
      <main className="chat-main flex-1 flex flex-col overflow-hidden">
        <ChatInterface conversationId={selectedConversationId || undefined} />
      </main>
    </div>
  );
}
