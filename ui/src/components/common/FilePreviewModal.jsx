import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const isImageFile = (file) => {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  if (file.content_type && file.content_type.startsWith('image/')) return true;
  const ext = (file.name || file.filename || '').split('.').pop().toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
};

export const isPdfFile = (file) => {
  if (!file) return false;
  if (file.type === 'application/pdf' || file.content_type === 'application/pdf') return true;
  const ext = (file.name || file.filename || '').split('.').pop().toLowerCase();
  return ext === 'pdf';
};

export const isPreviewableFile = (file) => isImageFile(file) || isPdfFile(file);

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function FilePreviewModal({
  isOpen,
  onClose,
  files = [],
  currentIndex = 0,
  onIndexChange,
}) {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setIndex(currentIndex);
    setZoom(1);
    setRotation(0);
  }, [currentIndex, isOpen]);

  const currentFile = useMemo(() => {
    if (!files || files.length === 0) return null;
    return files[index] || files[0] || null;
  }, [files, index]);

  const getFileUrl = (file) => {
    if (!file) return '';
    if (file.url) return file.url;
    if (file.content) return file.content;
    if (file.fileObject instanceof Blob || file.fileObject instanceof File) {
      return URL.createObjectURL(file.fileObject);
    }
    return '';
  };

  const fileUrl = useMemo(() => getFileUrl(currentFile), [currentFile]);
  const isImage = useMemo(() => isImageFile(currentFile), [currentFile]);
  const isPdf = useMemo(() => isPdfFile(currentFile), [currentFile]);

  // Keyboard navigation & dismissal
  useEffect(() => {
    if (!isOpen) return;

    // Body scroll lock
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft' && files.length > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && files.length > 1) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, index, files.length]);

  if (!isOpen || !currentFile) return null;

  const handlePrev = () => {
    const newIdx = (index - 1 + files.length) % files.length;
    setIndex(newIdx);
    onIndexChange?.(newIdx);
    setZoom(1);
    setRotation(0);
  };

  const handleNext = () => {
    const newIdx = (index + 1) % files.length;
    setIndex(newIdx);
    onIndexChange?.(newIdx);
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    if (!currentFile) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.download = currentFile.name || currentFile.filename || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const fileName = currentFile.name || currentFile.filename || 'Attachment';
  const fileSize = formatFileSize(currentFile.size || currentFile.file_size);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-3 md:p-6 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="File Preview"
    >
      <div
        className="bg-card text-card-foreground border border-border shadow-2xl rounded-2xl flex flex-col w-full max-w-6xl h-[92vh] overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header / Toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              {isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isPdf ? (
                <FileText className="w-5 h-5 text-red-500" />
              ) : (
                <FileCode className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-base font-bold text-foreground truncate" title={fileName}>
                {fileName}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {isImage && <span className="uppercase font-semibold text-primary">Image</span>}
                {isPdf && <span className="uppercase font-semibold text-red-500">PDF Document</span>}
                {!isImage && !isPdf && (
                  <span className="uppercase font-semibold text-muted-foreground">
                    {(fileName.split('.').pop() || 'File').toUpperCase()}
                  </span>
                )}
                {fileSize && <span>• {fileSize}</span>}
                {files.length > 1 && (
                  <span className="bg-muted px-2 py-0.5 rounded-full text-[11px] font-bold text-foreground ml-1">
                    {index + 1} of {files.length}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Zoom controls for Images */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border mr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono px-1 w-10 text-center select-none font-bold">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={handleRotate}
                  title="Rotate 90°"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                {(zoom !== 1 || rotation !== 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] px-2 font-semibold"
                    onClick={handleResetZoom}
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="hidden sm:flex items-center gap-1.5 h-8 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open New Tab
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1.5 h-8 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content Viewer Area */}
        <div className="relative flex-1 bg-slate-950/90 dark:bg-black overflow-hidden flex items-center justify-center select-none">
          {/* Multi-file Navigation Arrows */}
          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-110 focus:outline-none"
                title="Previous file (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-110 focus:outline-none"
                title="Next file (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Render Image */}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                }}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          )}

          {/* Render PDF */}
          {isPdf && (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              <iframe
                src={`${fileUrl}#toolbar=1`}
                title={fileName}
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* Render Non-Image & Non-PDF Fallback */}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-300 gap-4 max-w-md">
              <div className="p-4 rounded-full bg-slate-800 border border-slate-700">
                <FileText className="w-12 h-12 text-slate-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">{fileName}</h4>
                <p className="text-sm text-slate-400">
                  Preview is not available for this file type.
                </p>
              </div>
              <Button onClick={handleDownload} className="mt-2 font-bold gap-2">
                <Download className="w-4 h-4" /> Download File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
