import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  FlipHorizontal,
  ImagePlus,
  Move,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface ImageCropModalProps {
  isOpen: boolean;
  mode: 'profile' | 'banner';
  titleBn: string;
  titleEn?: string;
  currentImageUrl?: string;
  onSave: (croppedDataUrl: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  mode,
  titleBn,
  titleEn,
  currentImageUrl,
  onSave,
  onRemove,
  onClose,
}) => {
  const [sourceUrl, setSourceUrl] = useState<string>(currentImageUrl ?? '');
  const [aspect, setAspect] = useState<'1:1' | '3:4' | '4:1'>(
    mode === 'banner' ? '4:1' : '1:1'
  );
  const [zoom, setZoom] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [imageLoadedTick, setImageLoadedTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    setSourceUrl(currentImageUrl ?? '');
    setAspect(mode === 'banner' ? '4:1' : '1:1');
    setZoom(1.1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setCameraError('');
  }, [isOpen, currentImageUrl, mode, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Load image element whenever sourceUrl changes
  useEffect(() => {
    if (!sourceUrl) {
      imgRef.current = null;
      setPreviewDataUrl('');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoadedTick((t) => t + 1);
    };
    img.onerror = () => {
      imgRef.current = null;
      setCameraError('ছবিটি লোড করা যায়নি। অনুগ্রহ করে ডিভাইস থেকে একটি ছবি নির্বাচন করুন।');
    };
    img.src = sourceUrl;
  }, [sourceUrl]);

  const getCropFrameDimensions = useCallback(() => {
    if (aspect === '4:1') return { outW: 1200, outH: 300, boxW: 360, boxH: 90 };
    if (aspect === '3:4') return { outW: 360, outH: 480, boxW: 210, boxH: 280 };
    return { outW: 400, outH: 400, boxW: 240, boxH: 240 };
  }, [aspect]);

  // Render interactive editor canvas + live cropped preview
  const renderCanvasAndPreview = useCallback(() => {
    const canvas = editorCanvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#0b1424';
    ctx.fillRect(0, 0, cw, ch);

    const { outW, outH, boxW, boxH } = getCropFrameDimensions();
    const boxX = (cw - boxW) / 2;
    const boxY = (ch - boxH) / 2;

    if (img && img.naturalWidth > 0) {
      const rad = (rotation * Math.PI) / 180;
      const isSwapped = Math.abs(rotation % 180) === 90;
      const effW = isSwapped ? img.naturalHeight : img.naturalWidth;
      const effH = isSwapped ? img.naturalWidth : img.naturalHeight;

      const baseScale = Math.max(boxW / effW, boxH / effH);
      const scale = baseScale * zoom;

      ctx.save();
      ctx.translate(cw / 2 + offset.x, ch / 2 + offset.y);
      ctx.rotate(rad);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      // Export cropped output into preview data URL
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const octx = outCanvas.getContext('2d');
      if (octx) {
        const ratio = outW / boxW;
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, outW, outH);
        octx.save();
        octx.translate(outW / 2 + offset.x * ratio, outH / 2 + offset.y * ratio);
        octx.rotate(rad);
        octx.scale(scale * ratio, scale * ratio);
        octx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        octx.restore();
        try {
          setPreviewDataUrl(outCanvas.toDataURL('image/jpeg', 0.9));
        } catch {
          // Cross-origin tainted fallback
          setPreviewDataUrl(sourceUrl);
        }
      }
    }

    // Darken outside crop box
    ctx.save();
    ctx.fillStyle = 'rgba(7, 15, 29, 0.62)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill('evenodd');
    ctx.restore();

    // Crop outline & rule-of-thirds guides
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + boxW / 3, boxY);
    ctx.lineTo(boxX + boxW / 3, boxY + boxH);
    ctx.moveTo(boxX + (2 * boxW) / 3, boxY);
    ctx.lineTo(boxX + (2 * boxW) / 3, boxY + boxH);
    ctx.moveTo(boxX, boxY + boxH / 3);
    ctx.lineTo(boxX + boxW, boxY + boxH / 3);
    ctx.moveTo(boxX, boxY + (2 * boxH) / 3);
    ctx.lineTo(boxX + boxW, boxY + (2 * boxH) / 3);
    ctx.stroke();
  }, [getCropFrameDimensions, offset, rotation, sourceUrl, zoom, imageLoadedTick]);

  useEffect(() => {
    if (isOpen) renderCanvasAndPreview();
  }, [isOpen, renderCanvasAndPreview]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError('');
    stopCamera();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceUrl(reader.result);
        setZoom(1.1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStartCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraCaptureInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode === 'profile' ? 'user' : 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 60);
    } catch {
      setCameraError('ক্যামেরা চালু করা যায়নি — নিচের "ডিভাইস থেকে ছবি নিন" ব্যবহার করুন।');
      cameraCaptureInputRef.current?.click();
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const snap = document.createElement('canvas');
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    const sctx = snap.getContext('2d');
    if (sctx) {
      sctx.drawImage(video, 0, 0);
      setSourceUrl(snap.toDataURL('image/jpeg', 0.92));
      setZoom(1.1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
    stopCamera();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const finalUrl = previewDataUrl || sourceUrl;
    if (!finalUrl) return;
    onSave(finalUrl);
    stopCamera();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={titleBn}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#071526] text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{titleBn}</h3>
              <p className="text-xs text-slate-300">
                {titleEn ?? (mode === 'banner' ? 'School Cover Banner Crop & Adjust' : 'Profile Photo Crop, Zoom & Rotate Editor')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Source Selector Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraCaptureInputRef}
              type="file"
              accept="image/*"
              capture={mode === 'profile' ? 'user' : 'environment'}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              গ্যালারি থেকে নির্বাচন
            </button>
            {mode === 'profile' && (
              <button
                type="button"
                onClick={cameraActive ? stopCamera : handleStartCamera}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
              >
                <Camera className="w-4 h-4" />
                {cameraActive ? 'ক্যামেরা বন্ধ করুন' : 'ক্যামেরা দিয়ে ছবি তুলুন'}
              </button>
            )}
            {mode === 'profile' && (
              <div className="ml-auto flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAspect('1:1')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    aspect === '1:1'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  বর্গ (1:1)
                </button>
                <button
                  type="button"
                  onClick={() => setAspect('3:4')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    aspect === '3:4'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  পোর্ট্রেট (3:4)
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              {cameraError}
            </div>
          )}

          {/* Live Camera Viewfinder */}
          {cameraActive && (
            <div className="rounded-xl bg-slate-950 border border-slate-700 p-3 flex flex-col items-center gap-3">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full max-h-60 rounded-lg object-cover bg-black"
              />
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow"
              >
                <Camera className="w-4 h-4" />
                ছবি ক্যাপচার করুন
              </button>
            </div>
          )}

          {/* Interactive Crop Canvas + Live Preview */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_170px] gap-4 items-center">
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-[#0b1424]">
                <canvas
                  ref={editorCanvasRef}
                  width={440}
                  height={mode === 'banner' ? 220 : 300}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-full h-auto block cursor-grab active:cursor-grabbing touch-none"
                />
                {!sourceUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 text-xs pointer-events-none gap-1">
                    <ImagePlus className="w-7 h-7 text-slate-400" />
                    <span>উপরের বাটন থেকে ছবি নির্বাচন করুন</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5" />
                মাউস বা আঙুল দিয়ে ড্র্যাগ করে ছবির অবস্থান ঠিক করুন, জুম ও রোটেশন সমন্বয় করুন।
              </p>
            </div>

            {/* Live Preview Box */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 flex flex-col items-center justify-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Preview
              </span>
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Crop preview"
                  className={
                    mode === 'banner'
                      ? 'w-full h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm'
                      : aspect === '1:1'
                        ? 'w-28 h-28 rounded-full object-cover border-2 border-emerald-500 shadow-md'
                        : 'w-24 h-32 rounded-xl object-cover border-2 border-emerald-500 shadow-md'
                  }
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                  No Image
                </div>
              )}
              <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                {zoom.toFixed(2)}x · {rotation}°
              </span>
            </div>
          </div>

          {/* Controls: Zoom + Rotate + Reset */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={0.6}
                max={3.0}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label="Zoom"
                className="flex-1 accent-emerald-600"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, +(z + 0.15).toFixed(2)))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                title="Rotate Left 90°"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                -90°
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                title="Rotate Right 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
                +90°
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1.1);
                  setRotation(0);
                  setOffset({ x: 0, y: 0 });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                title="Reset Crop"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                রিসেট
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            {onRemove ? (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  stopCamera();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs sm:text-sm font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                ছবি সরান (ডিফল্ট)
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!sourceUrl}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                ক্রপ ও সেভ করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
