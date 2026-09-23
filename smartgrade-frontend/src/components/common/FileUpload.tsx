import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  accept: string;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ accept, onFileSelect, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
        isDragging
          ? 'border-primary bg-primary/10 scale-[1.01]'
          : 'border-slate-200 bg-slate-50/70 hover:bg-primary/5 hover:border-primary/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} disabled={disabled} className="hidden" />
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 shadow-xs">
        <Upload className="w-5 h-5" />
      </div>
      <p className="font-bold text-slate-800 text-sm">Drop file here or click to upload</p>
      <p className="text-xs text-slate-500 mt-1 font-medium">PDF, Image, or Text</p>
    </div>
  );
};

export default FileUpload;