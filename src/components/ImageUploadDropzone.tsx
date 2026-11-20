import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, Camera, X, Image as ImageIcon, Check, ZoomIn, Eye, Sparkles } from 'lucide-react';
import { getPlaceholderImage } from '../utils/security';

interface ImageUploadDropzoneProps {
  id?: string;
  label?: string;
  sublabel?: string;
  helperText?: string;
  currentImages?: string[];
  onImagesChange?: (images: string[]) => void;
  singleMode?: boolean;
  maxFiles?: number;
  previewHeightClass?: string;
  presetCategory?: 'scene' | 'complainant' | 'suspect' | 'evidence' | 'officer';
  presetLabel?: string;
  allowPresets?: boolean;
  required?: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  id = 'image_uploader',
  label = 'Upload Image Attachment',
  sublabel = 'Drag & drop image files or click to browse from device',
  helperText = 'Supports JPG, PNG, WEBP files up to 10MB per image.',
  currentImages = [],
  onImagesChange,
  singleMode = false,
  maxFiles = 8,
  previewHeightClass = 'h-24',
  presetCategory = 'evidence',
  presetLabel,
  allowPresets = true,
  required = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activePreviewModal, setActivePreviewModal] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = singleMode ? 1 : maxFiles - currentImages.length;
    if (remainingSlots <= 0) {
      setUploadStatus(`Maximum of ${maxFiles} image attachments reached.`);
      setTimeout(() => setUploadStatus(''), 3000);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: string[] = [];
    let processed = 0;

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setUploadStatus('Only valid image files (JPG, PNG, WEBP) are accepted.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newImages.push(e.target.result as string);
        }
        processed++;
        if (processed === filesToProcess.length) {
          if (singleMode) {
            onImagesChange?.(newImages.slice(0, 1));
          } else {
            onImagesChange?.([...currentImages, ...newImages]);
          }
          setUploadStatus(`Uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''} successfully.`);
          setTimeout(() => setUploadStatus(''), 2500);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = currentImages.filter((_, idx) => idx !== indexToRemove);
    onImagesChange?.(updated);
  };

  const handleAddPreset = (tag: string) => {
    const placeholder = getPlaceholderImage(presetCategory, tag);
    if (singleMode) {
      onImagesChange?.([placeholder]);
    } else {
      if (currentImages.length >= maxFiles) return;
      onImagesChange?.([...currentImages, placeholder]);
    }
    setUploadStatus(`Added sample image (${tag}).`);
    setTimeout(() => setUploadStatus(''), 2000);
  };

  return (
    <div className="space-y-3" id={id}>
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-800">
            {label} {required && <span className="text-rose-600">*</span>}
          </label>
          <p className="text-[11px] text-slate-500">{sublabel}</p>
        </div>

        {/* Quick presets option if user wants to test quickly */}
        {allowPresets && (
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handleAddPreset(presetLabel || label)}
              className="text-[11px] bg-blue-50 hover:bg-blue-100 text-[#0A2A66] border border-blue-200 px-2 py-1 rounded font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#C9A227]" />
              <span>Sample Photo Preset</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden native file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={!singleMode}
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#0A2A66] bg-blue-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-700 bg-slate-50/60 hover:bg-blue-50/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-11 h-11 rounded-full bg-blue-100/80 text-[#0A2A66] border border-blue-200 flex items-center justify-center shadow-xs">
            <Upload className="w-5 h-5" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#0A2A66] hover:underline block">
              Click to select photo files from device or drag &amp; drop here
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              {helperText} {!singleMode && `(Up to ${maxFiles} images)`}
            </span>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#0A2A66]" />
              <span>Browse Files</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Take Photo (Camera)</span>
            </button>
          </div>
        </div>
      </div>

      {uploadStatus && (
        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Uploaded Thumbnails Preview Grid */}
      {currentImages.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b border-slate-100 pb-1.5">
            <span>Uploaded Image Attachments ({currentImages.length})</span>
            <button
              type="button"
              onClick={() => onImagesChange?.([])}
              className="text-[10px] text-rose-600 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {currentImages.map((imgUrl, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-xs"
              >
                <img
                  src={imgUrl}
                  alt={`Attachment ${idx + 1}`}
                  className={`w-full ${previewHeightClass} object-cover`}
                />

                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 p-1">
                  <button
                    type="button"
                    onClick={() => setActivePreviewModal(imgUrl)}
                    title="Zoom in preview"
                    className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow cursor-pointer transition-transform hover:scale-110"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove this photo"
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow cursor-pointer transition-transform hover:scale-110"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Magnification Modal */}
      {activePreviewModal && (
        <div
          onClick={() => setActivePreviewModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-700"
          >
            <div className="p-3 bg-[#0A2A66] text-white flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                <span className="text-xs font-bold uppercase tracking-wider">Image Attachment High-Resolution Inspector</span>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewModal(null)}
                className="p-1 text-slate-300 hover:text-white rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={activePreviewModal}
                alt="Enlarged attachment"
                className="max-h-[70vh] max-w-full object-contain rounded border border-slate-700 shadow-lg"
              />
            </div>
            <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setActivePreviewModal(null)}
                className="px-4 py-1.5 bg-[#0A2A66] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#071D49]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
