import React from 'react';
import { Upload } from 'lucide-react';
import { useUploadContent, type Content } from '../hooks/useContent';

interface ContentUploadProps {
  onUploadComplete?: (content: Content) => void;
}

export const ContentUpload: React.FC<ContentUploadProps> = ({ onUploadComplete }) => {
  const { upload, uploading, error } = useUploadContent();

  const handleUpload = async () => {
    try {
      const content = await upload('manual');
      if (content && onUploadComplete) {
        onUploadComplete(content);
      }
    } catch (err) {
      // Error is already set in the hook
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="content-upload p-4">
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload size={16} />
        {uploading ? 'Uploading...' : 'Upload Content'}
      </button>

      {error && (
        <div className="mt-2 text-sm text-destructive">
          {error.message}
        </div>
      )}
    </div>
  );
};
