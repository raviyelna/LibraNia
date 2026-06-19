import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import type { Content } from '../hooks/useContent';

interface ContentListProps {
  content: Content[];
  onDelete?: (id: string) => void;
  onSelect?: (content: Content) => void;
}

export const ContentList: React.FC<ContentListProps> = ({ content, onDelete, onSelect }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const getSourceBadge = (source: 'manual' | 'ai-generated') => {
    if (source === 'manual') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
          Manual
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
        AI Generated
      </span>
    );
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  if (content.length === 0) {
    return (
      <div className="content-list-empty p-8 text-center text-secondary">
        No content uploaded yet. Click "Upload Content" to add files.
      </div>
    );
  }

  return (
    <div className="content-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {content.map((item) => (
        <div
          key={item.id}
          className="content-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelect?.(item)}
        >
          {/* Thumbnail or Icon */}
          <div className="content-preview mb-3 flex items-center justify-center h-32 bg-accent/10 rounded">
            {item.thumbnail_path && isImage(item.mime_type) ? (
              <img
                src={`file://${item.thumbnail_path}`}
                alt={item.original_filename}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <FileText size={48} className="text-secondary" />
            )}
          </div>

          {/* Metadata */}
          <div className="content-metadata">
            <h3 className="text-sm font-medium text-foreground mb-2 truncate" title={item.original_filename}>
              {item.original_filename}
            </h3>

            <div className="flex items-center gap-2 mb-2">
              {getSourceBadge(item.source)}
              {item.source === 'ai-generated' && item.confidence_score !== null && (
                <span className="text-xs text-secondary">
                  {Math.round(item.confidence_score * 100)}% confidence
                </span>
              )}
            </div>

            <div className="text-xs text-secondary space-y-1">
              <div>{formatDate(item.created_at)}</div>
              <div>{formatFileSize(item.file_size)}</div>
              <div className="break-all" title={item.file_path}>Local path: {item.file_path}</div>
            </div>
          </div>

          {/* Actions */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
