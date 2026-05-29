import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useUploadContent, type Content } from '../hooks/useContent';
import toast from 'react-hot-toast';

interface ContentUploadProps {
  onUploadComplete?: (content: Content) => void;
}

export const ContentUpload: React.FC<ContentUploadProps> = ({ onUploadComplete }) => {
  const { upload, uploading, progress, error } = useUploadContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const content = await upload(file, 'manual');
      toast.success(`Uploaded ${file.name}`);
      if (onUploadComplete) {
        onUploadComplete(content);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // Error is already handled by handleAPIError in the hook
      console.error('Upload failed:', err);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`content-upload p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
        dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <Upload size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading ? `Uploading... ${progress.toFixed(0)}%` : 'Click or drag file to upload'}
        </p>

        {uploading && (
          <div className="w-full max-w-xs">
            <progress
              value={progress}
              max={100}
              className="w-full h-2 rounded-full overflow-hidden"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-destructive text-center">
          {error.message}
        </div>
      )}
    </div>
  );
};
