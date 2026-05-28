import { useState } from 'react';
import { useConversations } from '../hooks/useConversations';
import { ChatInterface } from '../components/Chat/ChatInterface';
import { Button } from '../components/ui/Button';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

export function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
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
    setEditingId(null);
  };

  const handleStartEdit = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await window.api.conversation.rename(id, editTitle.trim());
      setEditingId(null);
      refetch();
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await window.api.conversation.delete(id);
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
      }
      refetch();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  return (
    <div className="chat-layout flex h-screen">
      {/* Conversation list sidebar (left) */}
      <aside className="conversation-sidebar w-80 border-r border-border overflow-y-auto bg-background">
        <div className="p-4 border-b border-border sticky top-0 bg-background z-10">
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
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`group relative px-3 py-3 rounded-md transition-colors cursor-pointer ${
                    selectedConversationId === conversation.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {editingId === conversation.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(conversation.id, e as any);
                          if (e.key === 'Escape') handleCancelEdit(e as any);
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveEdit(conversation.id, e)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Check size={14} className="text-green-600" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {conversation.title}
                          </div>
                          {conversation.messages && conversation.messages.length > 0 && (
                            <div className="text-xs text-secondary mt-1 truncate">
                              {conversation.messages[conversation.messages.length - 1].content.substring(0, 50)}
                              {conversation.messages[conversation.messages.length - 1].content.length > 50 ? '...' : ''}
                            </div>
                          )}
                          <div className="text-xs text-secondary mt-1">
                            {new Date(conversation.updated_at).toLocaleDateString()} · {conversation.messages?.length || 0} msgs
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleStartEdit(conversation.id, conversation.title, e)}
                            className="p-1 hover:bg-accent rounded"
                            title="Rename"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(conversation.id, e)}
                            className="p-1 hover:bg-accent rounded"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
