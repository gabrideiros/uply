// Dropzone.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { UploadProgress } from './UploadProgress';

interface DropzoneProps {
  onFilesUploaded: (files: File[]) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const simulateUpload = (file: File) => {
    setCurrentFile(file.name);
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            onFilesUploaded([file]);
          }, 300);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      simulateUpload(acceptedFiles[0]);
    }
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`
        flex-1 border-2 border-dashed rounded-lg p-4 cursor-pointer
        ${isDragActive ? 'border-blue-400 bg-blue-400/5' : 'border-gray-600 hover:border-gray-500'}
        flex flex-col items-center justify-center gap-2
      `}
      style={{ margin: '5px' }}
    >
      <input {...getInputProps()} />
      
      {isUploading ? (
        <UploadProgress fileName={currentFile || ''} progress={uploadProgress} />
      ) : (
        <>
          <Upload className="w-4 h-4 text-gray-400" />
          <p className="text-gray-400 text-sm">
            {isDragActive ? 'Drop to upload' : 'Drop files here'}
          </p>
        </>
      )}
    </div>
  );
};