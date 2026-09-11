import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  PenTool, 
  Square, 
  ArrowUpRight, 
  Type, 
  Undo2, 
  RotateCcw, 
  Save, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Attachment } from '../types';

interface CanvasAnnotatorModalProps {
  attachment: Attachment | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAnnotation: (attachmentId: number, newFileUrl: string) => Promise<void>;
}

type ToolMode = 'pen' | 'rect' | 'arrow' | 'text';

const COLORS = [
  { name: '標註紅', value: '#ef4444' },
  { name: '警示黃', value: '#eab308' },
  { name: '指示藍', value: '#3b82f6' },
  { name: '結構綠', value: '#10b981' },
  { name: '文字白', value: '#ffffff' },
];

const STROKE_WIDTHS = [
  { label: '細 (2px)', value: 2 },
  { label: '中 (4px)', value: 4 },
  { label: '粗 (8px)', value: 8 },
];

export const CanvasAnnotatorModal: React.FC<CanvasAnnotatorModalProps> = ({
  attachment,
  isOpen,
  onClose,
  onSaveAnnotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [currentTool, setCurrentTool] = useState<ToolMode>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ef4444'); // Default red
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [annotationText, setAnnotationText] = useState<string>('此處需結構技師再次核算');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // Load image when modal opens
  useEffect(() => {
    if (!isOpen || !attachment) return;

    setImageLoaded(false);
    setSavedSuccess(false);
    setSaveError(null);

    const img = new Image();
    // Allow cross origin loading for svgs or external assets
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      initCanvas(img);
      setImageLoaded(true);
    };
    img.src = attachment.file_url;
  }, [isOpen, attachment]);

  const initCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Max container bounds
    const maxWidth = Math.min(1000, container.clientWidth - 32);
    const maxHeight = 620;

    let targetWidth = img.naturalWidth || 800;
    let targetHeight = img.naturalHeight || 550;

    // Scale to fit while maintaining aspect ratio
    const scale = Math.min(maxWidth / targetWidth, maxHeight / targetHeight, 1);
    const finalWidth = Math.round(targetWidth * scale);
    const finalHeight = Math.round(targetHeight * scale);

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    ctx.clearRect(0, 0, finalWidth, finalHeight);
    ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

    // Initial snapshot for undo history
    const initialSnapshot = ctx.getImageData(0, 0, finalWidth, finalHeight);
    setHistory([initialSnapshot]);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPos(coords);

    if (currentTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (currentTool === 'text') {
      const textToDraw = annotationText.trim() || '標註說明';
      ctx.font = `bold ${Math.max(16, strokeWidth * 4)}px sans-serif`;
      ctx.fillStyle = currentColor;
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 4;
      ctx.fillText(textToDraw, coords.x, coords.y);
      ctx.shadowBlur = 0;
      saveHistoryState();
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);

    if (currentTool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (currentTool === 'rect' || currentTool === 'arrow') {
      // Restore previous state to show dynamic preview while dragging
      if (history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'rect') {
        const width = coords.x - startPos.x;
        const height = coords.y - startPos.y;
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (currentTool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y, strokeWidth * 3);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveHistoryState();
  };

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), currentData]);
  };

  // Helper to draw clean arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    arrowSize: number
  ) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = currentColor;
    ctx.fill();
  };

  // Undo
  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove latest state
    const previousState = newHistory[newHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  // Reset to original image (pushes current state to history first so it can be undone)
  const handleReset = () => {
    if (!originalImage || !canvasRef.current) return;
    saveHistoryState();
    initCanvas(originalImage);
  };

  // Save annotation (F-3.2: 點擊「覆蓋儲存標註」後，將 Canvas 導出為 Base64/PNG 並更新附件資料)
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !attachment) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await onSaveAnnotation(attachment.id, dataUrl);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to save annotation:', err);
      setSaveError('儲存標註時發生錯誤，請確認網路連線後重試');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !attachment) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black max-w-5xl w-full flex flex-col overflow-hidden font-mono">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-black text-white border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-sm font-serif font-bold uppercase tracking-wider flex items-center space-x-2">
                <span>線上畫布標註工具 // CANVAS ANNOTATOR</span>
                <span className="text-xs font-mono font-normal text-neutral-400">
                  [{attachment.file_name}]
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                可使用矩形框、箭頭或畫筆進行工程疑義圈選標註，完成後點選「覆蓋儲存標註」。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white hover:bg-white hover:text-black border border-white transition-none cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-neutral-100 border-b-2 border-black flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tool Modes */}
          <div className="flex items-center space-x-1 border-2 border-black bg-white p-1">
            <button
              onClick={() => setCurrentTool('pen')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 font-bold uppercase transition-none cursor-pointer ${
                currentTool === 'pen'
                  ? 'bg-black text-white'
                  : 'text-black hover:bg-neutral-200'
              }`}
              title="自由曲線畫筆"
            >
              <PenTool className="w-3.5 h-3.5 stroke-[2]" />
              <span>畫筆</span>
            </button>

            <button
              onClick={() => setCurrentTool('rect')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 font-bold uppercase transition-none cursor-pointer ${
                currentTool === 'rect'
                  ? 'bg-black text-white'
                  : 'text-black hover:bg-neutral-200'
              }`}
              title="矩形圈選框"
            >
              <Square className="w-3.5 h-3.5 stroke-[2]" />
              <span>矩形框</span>
            </button>

            <button
              onClick={() => setCurrentTool('arrow')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 font-bold uppercase transition-none cursor-pointer ${
                currentTool === 'arrow'
                  ? 'bg-black text-white'
                  : 'text-black hover:bg-neutral-200'
              }`}
              title="指引箭頭"
            >
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              <span>箭頭</span>
            </button>

            <button
              onClick={() => setCurrentTool('text')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 font-bold uppercase transition-none cursor-pointer ${
                currentTool === 'text'
                  ? 'bg-black text-white'
                  : 'text-black hover:bg-neutral-200'
              }`}
              title="點擊畫布輸入文字"
            >
              <Type className="w-3.5 h-3.5 stroke-[2]" />
              <span>文字</span>
            </button>
          </div>

          {/* Quick text input field when text tool is active */}
          {currentTool === 'text' && (
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 border-2 border-black">
              <span className="text-black text-xs font-bold uppercase">文字:</span>
              <input
                type="text"
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="輸入文字後點畫布置放"
                className="bg-white text-black text-xs px-2 py-0.5 border border-black w-44 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-600">[點擊置放]</span>
            </div>
          )}

          {/* Color Selector */}
          <div className="flex items-center space-x-2 bg-white px-2.5 py-1.5 border-2 border-black">
            <span className="text-black font-bold uppercase">顏色:</span>
            <div className="flex items-center space-x-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCurrentColor(c.value)}
                  className={`w-5 h-5 border border-black cursor-pointer ${
                    currentColor === c.value
                      ? 'ring-2 ring-black'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 border-2 border-black">
            <span className="text-black font-bold uppercase">線寬:</span>
            <select
              aria-label="選擇線寬"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="bg-transparent text-black font-bold focus:outline-none cursor-pointer"
            >
              {STROKE_WIDTHS.map((s) => (
                <option key={s.value} value={s.value} className="bg-white text-black">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Undo and Reset Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-1.5 bg-white hover:bg-neutral-100 text-black disabled:opacity-30 disabled:cursor-not-allowed border-2 border-black transition-none cursor-pointer"
              title="復原上一步"
            >
              <Undo2 className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 bg-white hover:bg-neutral-100 text-black border-2 border-black transition-none cursor-pointer"
              title="清除重來"
            >
              <RotateCcw className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div
          ref={containerRef}
          className="p-6 bg-neutral-900 flex items-center justify-center min-h-[480px] overflow-auto select-none"
        >
          {!imageLoaded && (
            <div className="text-white flex items-center space-x-2 text-sm font-mono uppercase">
              <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></span>
              <span>正在載入圖檔畫布...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`border-2 border-black cursor-crosshair bg-white max-w-full ${
              !imageLoaded ? 'hidden' : 'block'
            }`}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="text-xs text-neutral-600 flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2] shrink-0 text-black" />
            {saveError ? (
              <span className="text-black font-bold uppercase">{saveError}</span>
            ) : (
              <span>儲存後將覆蓋此附件圖檔，並記錄於專案稽核歷程中</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 text-black text-xs font-bold uppercase border-2 border-black transition-none cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase border-2 border-black transition-none disabled:opacity-50 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[2]" />
                  <span>已成功覆蓋儲存！</span>
                </>
              ) : isSaving ? (
                <span>正在儲存圖檔...</span>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2]" />
                  <span>覆蓋儲存標註 (SAVE)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
