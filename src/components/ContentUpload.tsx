import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useUploadContent, type Content } from '../hooks/useContent';
import toast from 'react-hot-toast';

interface ContentUploadProps {
  noteId?: string;
  onUploadComplete?: (content: Content) => void;
}

export const ContentUpload: React.FC<ContentUploadProps> = ({ noteId, onUploadComplete }) => {
  const { upload, uploading, progress, error } = useUploadContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setBatchCount(files.length);
    let uploadedCount = 0;
    try {
      for (const [index, file] of files.entries()) {
        setCurrentIndex(index + 1);
        try {
          const content = await upload(file, 'manual', { note_id: noteId });
          uploadedCount += 1;
          if (onUploadComplete) {
            onUploadComplete(content);
          }
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
        }
      }

      if (uploadedCount > 0) {
        toast.success(`Uploaded ${uploadedCount} file${uploadedCount === 1 ? '' : 's'}`);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setBatchCount(0);
      setCurrentIndex(0);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleFiles(Array.from(event.target.files || []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(Array.from(e.dataTransfer.files));
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
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <Upload size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading
            ? `Uploading ${batchCount > 1 ? `${currentIndex}/${batchCount} ` : ''}${progress.toFixed(0)}%`
            : 'Click or drag files to upload'}
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
