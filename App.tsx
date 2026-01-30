
import React, { useState, useRef, useEffect } from 'react';
import { executeGeminiTask, validateGoogleKey, GOOGLE_MODELS } from './services/googleAiService';
import { TextElement, ImageElement, DesignElement, SUPPORTED_FONTS } from './types';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cleanedImage, setCleanedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');

  const [editMode, setEditMode] = useState<'text' | 'brush'>('text');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(50);
  const [customInstruction, setCustomInstruction] = useState('');

  const [zoom, setZoom] = useState(1);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [showGuide, setShowGuide] = useState(false); // 가이드 모달 상태

  // Google AI Settings
  const [googleKey, setGoogleKey] = useState(localStorage.getItem('google_api_key') || '');
  const [selectedModelId, setSelectedModelId] = useState('gemini-2.5-flash-image');
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ valid: boolean | null; message: string }>({ valid: null, message: '' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementImageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const brushCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setOriginalImage(base64);
      setCleanedImage(null);
      setHistory([]);
      setRedoStack([]);
      setIsCleaning(true);
      setElements([]);
      setSelectedId(null);
      setEditMode('text');
      setCustomInstruction('');
      setZoom(1);

      try {
        if (!googleKey) {
          alert('먼저 Google AI API 키를 입력하고 검증해 주세요.');
          setIsSettingsOpen(true);
          return;
        }
        const result = await executeGeminiTask(googleKey, selectedModelId, base64);
        setCleanedImage(result);
      } catch (err: any) {
        console.error(err);
        alert(`텍스트 제거 실패: ${err.message}`);
      } finally {
        setIsCleaning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleElementImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const newImg: ImageElement = {
        id: `img-${Date.now()}`,
        type: 'image',
        src,
        x: 50,
        y: 50,
        width: 25,
        height: 25,
        zIndex: elements.length + 100,
        isVisible: true
      };
      setElements([...elements, newImg]);
      setSelectedId(newImg.id);
      setEditMode('text');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!originalImage) return;
    const img = new Image();
    img.src = originalImage;
    img.onload = () => {
      const cw = containerRef.current?.clientWidth || 800;
      const ch = containerRef.current?.clientHeight || 600;
      const ratio = img.width / img.height;
      let w = cw * 0.8, h = w / ratio;
      if (h > ch * 0.8) { h = ch * 0.8; w = h * ratio; }
      setCanvasSize({ width: w, height: h });
    };
  }, [originalImage]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (editMode !== 'brush') return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = brushCanvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: any) => {
    if (!isDrawing || editMode !== 'brush' || !brushCanvasRef.current) return;
    const canvas = brushCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#FF0000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearBrush = () => {
    const canvas = brushCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const applyAIRequest = async () => {
    if (!originalImage) return;
    setIsCleaning(true);

    let maskData: string | undefined = undefined;
    if (brushCanvasRef.current) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = brushCanvasRef.current.width;
      tempCanvas.height = brushCanvasRef.current.height;
      const tCtx = tempCanvas.getContext('2d');
      tCtx?.drawImage(brushCanvasRef.current, 0, 0);

      const data = tCtx?.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
      let hasDrawing = false;
      if (data) {
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) { hasDrawing = true; break; }
        }
      }
      if (hasDrawing) maskData = tempCanvas.toDataURL('image/png');
    }

    try {
      if (!googleKey) {
        alert('먼저 Google AI API 키를 입력하고 검증해 주세요.');
        setIsSettingsOpen(true);
        return;
      }
      if (cleanedImage) setHistory(prev => [...prev, cleanedImage]);
      setRedoStack([]);
      const result = await executeGeminiTask(googleKey, selectedModelId, originalImage, maskData, customInstruction);
      setCleanedImage(result);
      clearBrush();
    } catch (err: any) {
      console.error(err);
      alert(`AI 요청 처리 실패: ${err.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || !cleanedImage) return;
    const prevImage = history[history.length - 1];
    setRedoStack(prev => [...prev, cleanedImage]);
    setCleanedImage(prevImage);
    setHistory(prev => prev.slice(0, -1));
  };

  const addText = () => {
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: '새로운 텍스트',
      color: '#000000',
      fontSize: 40,
      fontFamily: SUPPORTED_FONTS[0].value,
      textAlign: 'center',
      x: 50,
      y: 50,
      width: 30,
      height: 10,
      zIndex: elements.length + 100,
      isVisible: true
    };
    setElements([...elements, newText]);
    setSelectedId(newText.id);
    setEditMode('text');
  };

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } as any : el));
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const handleDownload = async () => {
    if (!workspaceRef.current || !cleanedImage) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = cleanedImage;
    await new Promise(resolve => img.onload = resolve);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    for (const el of elements.filter(e => e.isVisible)) {
      if (el.type === 'text') {
        ctx.fillStyle = el.color;
        const fSize = (el.fontSize / 1000) * canvas.height;
        ctx.font = `bold ${fSize}px ${el.fontFamily}`;
        ctx.textAlign = el.textAlign;
        ctx.textBaseline = 'middle';
        let xPos = (el.x / 100) * canvas.width;
        if (el.textAlign === 'left') xPos = ((el.x - (el.width / 2)) / 100) * canvas.width;
        else if (el.textAlign === 'right') xPos = ((el.x + (el.width / 2)) / 100) * canvas.width;
        ctx.fillText(el.content, xPos, (el.y / 100) * canvas.height);
      } else if (el.type === 'image') {
        const itemImg = new Image();
        itemImg.src = el.src;
        await new Promise(resolve => itemImg.onload = resolve);
        const w = (el.width / 100) * canvas.width;
        const h = (el.height / 100) * canvas.height;
        const x = (el.x / 100) * canvas.width - (w / 2);
        const y = (el.y / 100) * canvas.height - (h / 2);
        ctx.drawImage(itemImg, x, y, w, h);
      }
    }

    const link = document.createElement('a');
    link.download = `design-output.${exportFormat}`;
    link.href = canvas.toDataURL(`image/${exportFormat}`);
    link.click();
  };

  const startResize = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const target = elements.find(el => el.id === id);
    if (!target) return;
    const initW = target.width, initH = target.height;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;
      updateElement(id, {
        width: Math.max(2, initW + (deltaX / canvasSize.width) * 100),
        height: Math.max(2, initH + (deltaY / canvasSize.height) * 100)
      });
    };
    const handleMouseUp = () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-slate-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-[#111114] flex flex-col shadow-2xl z-[150]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
            <h1 className="text-[10px] font-black tracking-widest uppercase text-white">AI Design Pro</h1>
          </div>
          {/* 가이드 보기 버튼 */}
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 text-slate-500 hover:text-indigo-400 transition"
            title="사용 방법 보기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* AI Settings Section */}
          <section className="bg-white/5 rounded-2xl border border-white/5 p-1">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-full flex items-center justify-between p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>AI Settings</span>
              </div>
              <svg className={`w-3 h-3 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isSettingsOpen && (
              <div className="p-3 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 flex justify-between">
                    Google API Key
                    {keyStatus.valid !== null && (
                      <span className={`lowercase font-medium ${keyStatus.valid ? 'text-green-500' : 'text-red-500'}`}>
                        {keyStatus.valid ? '● Verified' : '● Invalid'}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                      placeholder="AIza..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-[11px] outline-none focus:border-indigo-500/50 transition"
                    />
                    <button
                      onClick={async () => {
                        setIsValidating(true);
                        const res = await validateGoogleKey(googleKey);
                        setKeyStatus(res);
                        setIsValidating(false);
                        if (res.valid) localStorage.setItem('google_api_key', googleKey);
                      }}
                      disabled={isDrawing || !googleKey}
                      className="px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-bold transition active:scale-95 disabled:opacity-30"
                    >
                      {isValidating ? '...' : '검증'}
                    </button>
                  </div>
                  {keyStatus.message && <p className={`text-[9px] ${keyStatus.valid ? 'text-green-500/70' : 'text-red-400'}`}>{keyStatus.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500">Model Selector</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[11px] outline-none focus:border-indigo-500/50 transition cursor-pointer"
                  >
                    {Array.from(new Set(GOOGLE_MODELS.map(m => m.group))).map(group => (
                      <optgroup key={group} label={group}>
                        {GOOGLE_MODELS.filter(m => m.group === group).map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
            <button onClick={() => setEditMode('text')} className={`flex flex-col items-center py-3 rounded-lg transition ${editMode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <span className="text-[9px] font-black uppercase">Layout Mode</span>
            </button>
            <button onClick={() => { setEditMode('brush'); setSelectedId(null); }} className={`flex flex-col items-center py-3 rounded-lg transition ${editMode === 'brush' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <span className="text-[9px] font-black uppercase">Eraser Mode</span>
            </button>
          </div>

          <section className="space-y-4 pt-2">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add Elements</h2>
              <div className="flex gap-2">
                <button onClick={addText} disabled={!cleanedImage} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase transition border border-indigo-500/20">
                  <span className="text-sm">+</span> Text
                </button>
                <button onClick={() => elementImageInputRef.current?.click()} disabled={!cleanedImage} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase transition border border-indigo-500/20">
                  <span className="text-sm">+</span> Image
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {elements.length === 0 && <p className="text-[10px] text-center text-slate-600 py-4 italic">No layers added yet.</p>}
              {[...elements].reverse().map(el => (
                <div key={el.id} onClick={() => setSelectedId(el.id)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedId === el.id ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-black ${el.type === 'text' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-pink-500/20 text-pink-400'}`}>
                    {el.type === 'text' ? 'T' : 'IMG'}
                  </div>
                  <span className="text-[11px] font-medium truncate flex-1">{el.type === 'text' ? el.content : 'Image Element'}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="p-1 text-slate-600 hover:text-red-500 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {selectedElement && (
            <section className="space-y-5 pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Properties</h2>
              {selectedElement.type === 'text' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Content</label>
                    <textarea value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-indigo-500/50 min-h-[60px] resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Font</label>
                      <select value={selectedElement.fontFamily} onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-[11px] outline-none">
                        {SUPPORTED_FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Color</label>
                      <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} className="w-full h-8 bg-black/50 border border-white/10 rounded-lg p-1 cursor-pointer" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Alignment</label>
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => updateElement(selectedElement.id, { textAlign: align })}
                          className={`flex-1 py-1.5 rounded transition text-[10px] font-black uppercase ${selectedElement.textAlign === align
                              ? 'bg-indigo-600 text-white shadow-lg'
                              : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Font Size</label>
                      <span className="text-[10px] font-mono text-indigo-500">{selectedElement.fontSize}px</span>
                    </div>
                    <input type="range" min="10" max="400" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })} className="w-full accent-indigo-600 h-1 bg-white/10 rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-pink-500/5 p-4 rounded-xl border border-pink-500/10"><p className="text-[10px] text-pink-400 font-medium text-center">Drag the corner to resize.</p></div>
              )}
            </section>
          )}

          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>AI Prompt</h2>
            <div className="relative">
              <textarea value={customInstruction} onChange={(e) => setCustomInstruction(e.target.value)} placeholder="지시사항..." className="w-full h-24 bg-black/60 border border-white/10 rounded-xl p-3 text-[11px] outline-none focus:border-indigo-500/50 transition-all resize-none" disabled={!originalImage || isCleaning} />
              <button onClick={applyAIRequest} disabled={!originalImage || isCleaning} className="absolute bottom-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg disabled:opacity-30 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#0a0a0c]">
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition active:scale-95 shadow-xl">배경 이미지 업로드</button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main ref={containerRef} className="flex-1 relative flex items-center justify-center p-12 bg-pattern overflow-auto custom-scrollbar">
        {originalImage && (
          <div
            ref={workspaceRef}
            className={`relative shadow-2xl bg-white select-none transition-transform duration-200 ease-out origin-center ${editMode === 'brush' ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ width: canvasSize.width, height: canvasSize.height, transform: `scale(${zoom})`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
          >
            <img src={showOriginal || !cleanedImage ? originalImage : cleanedImage} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="Base" />
            <canvas ref={brushCanvasRef} width={canvasSize.width} height={canvasSize.height} className={`absolute inset-0 z-40 transition-opacity ${editMode === 'brush' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />

            {editMode === 'text' && !showOriginal && cleanedImage && elements.filter(el => el.isVisible).map(el => (
              <div
                key={el.id}
                className={`absolute z-50 transform -translate-x-1/2 -translate-y-1/2 ${selectedId === el.id ? 'ring-2 ring-indigo-500 shadow-2xl' : ''}`}
                style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'move' }}
                onMouseDown={(e) => {
                  setSelectedId(el.id);
                  const startX = e.clientX, startY = e.clientY, initX = el.x, initY = el.y;
                  const handleMove = (mE: MouseEvent) => {
                    const deltaX = (mE.clientX - startX) / zoom;
                    const deltaY = (mE.clientY - startY) / zoom;
                    updateElement(el.id, {
                      x: Math.max(0, Math.min(100, initX + (deltaX / canvasSize.width) * 100)),
                      y: Math.max(0, Math.min(100, initY + (deltaY / canvasSize.height) * 100))
                    });
                  };
                  const handleUp = () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
                  window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp);
                }}
              >
                {selectedId === el.id && (
                  <div onMouseDown={(e) => startResize(e, el.id)} className="absolute -bottom-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full cursor-nwse-resize z-[60] border-2 border-white shadow-xl hover:scale-125 transition-transform" />
                )}
                {el.type === 'text' ? (
                  <textarea className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-0 m-0 font-bold leading-tight" style={{ color: el.color, fontSize: `${(el.fontSize / 1000) * canvasSize.height}px`, fontFamily: el.fontFamily, textAlign: el.textAlign, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: selectedId === el.id ? 'auto' : 'none' }} value={el.content} onChange={(e) => updateElement(el.id, { content: e.target.value })} spellCheck={false} />
                ) : (
                  <img src={el.src} className="w-full h-full object-contain pointer-events-none" alt="Layer" />
                )}
              </div>
            ))}

            {isCleaning && (
              <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center px-12 animate-in fade-in">
                <div className="w-16 h-16 border-4 border-white/5 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">AI Re-constructing</h3>
              </div>
            )}
          </div>
        )}

        {!originalImage && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-3xl mx-auto flex items-center justify-center border border-white/10 shadow-2xl">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">AI Design Studio</h2>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Professional Image & Text Refiner</p>
          </div>
        )}

        {/* 통합 컨트롤러 (줌 + 메뉴 토글) - 오른쪽 배치 */}
        {originalImage && (
          <div className="fixed top-1/2 -translate-y-1/2 right-10 flex flex-col items-center gap-3 z-[200]">
            <button
              onClick={() => setIsMenuVisible(!isMenuVisible)}
              className="w-24 h-12 bg-[#111114]/90 backdrop-blur-xl border border-white/10 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-white/5 transition-all shadow-2xl group active:scale-95"
              title={isMenuVisible ? "Hide Menu" : "Show Menu"}
            >
              <svg className={`w-5 h-5 text-white transition-transform duration-500 ${isMenuVisible ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="w-10 h-px bg-white/10 my-2"></div>

            <div className="flex flex-col gap-2 p-2 bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl">
              <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 3))} className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center transition font-bold text-xl">+</button>
              <div className="w-12 h-12 bg-white/5 text-white rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-tighter">
                {Math.round(zoom * 100)}%
              </div>
              <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))} className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center transition font-bold text-xl">-</button>
              <button onClick={() => setZoom(1)} className="w-12 h-12 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition text-[9px] font-black tracking-widest uppercase shadow-lg shadow-indigo-600/20">RESET</button>
            </div>
          </div>
        )}

        {/* 하단 메뉴 바 */}
        {originalImage && (
          <div className="fixed bottom-0 left-80 right-0 flex flex-col items-center pointer-events-none z-[101] pb-10">
            <div className={`pointer-events-auto flex items-center gap-3 bg-[#111114]/95 backdrop-blur-3xl border border-white/10 p-3.5 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isMenuVisible ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0'}`}>
              <button
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                className="px-10 py-4 text-[11px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white rounded-[1.8rem] transition active:scale-95 border border-white/5"
              >
                Original View
              </button>
              <div className="w-px h-10 bg-white/10 mx-2"></div>
              <div className="flex items-center gap-2 pr-1">
                <div className="relative">
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="appearance-none bg-black/40 text-[11px] font-black px-8 py-4 rounded-[1.8rem] border border-white/10 outline-none text-indigo-400 cursor-pointer pr-12 hover:border-indigo-500/50 transition">
                    <option value="png">PNG</option>
                    <option value="jpeg">JPG</option>
                    <option value="webp">WEBP</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg></div>
                </div>
                <button onClick={handleDownload} disabled={!cleanedImage} className="px-14 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-black uppercase tracking-widest rounded-[1.8rem] transition shadow-xl shadow-indigo-600/40 active:scale-95 disabled:opacity-30">Download Result</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 도움말 가이드 모달 */}
      {showGuide && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#111114] border border-white/10 rounded-[2.5rem] max-w-2xl w-full p-10 shadow-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="space-y-8">
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">AI Design Pro 사용 가이드</h2>
                <p className="text-indigo-400 font-medium text-lg leading-relaxed">
                  "이미지 속 텍스트를 마법처럼 지우고, 나만의 디자인으로 재탄생시키는 지능형 레이아웃 에디터입니다."
                </p>
              </div>

              <div className="space-y-6 text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black flex-shrink-0">1</span>
                    <p className="text-sm leading-relaxed"><span className="text-white font-bold block mb-1">이미지 업로드</span>편집할 이미지를 업로드하면 AI가 자동으로 텍스트를 감지하여 제거합니다.</p>
                  </div>
                  <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black flex-shrink-0">2</span>
                    <p className="text-sm leading-relaxed"><span className="text-white font-bold block mb-1">정밀 지우개</span>AI가 놓친 부분은 Eraser Mode에서 브러시로 칠한 후 AI Prompt를 입력해 수정하세요.</p>
                  </div>
                  <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black flex-shrink-0">3</span>
                    <p className="text-sm leading-relaxed"><span className="text-white font-bold block mb-1">디자인 요소 추가</span>Text와 Image 버튼으로 새로운 문구와 이미지를 레이어에 추가할 수 있습니다.</p>
                  </div>
                  <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black flex-shrink-0">4</span>
                    <p className="text-sm leading-relaxed"><span className="text-white font-bold block mb-1">자유로운 편집</span>추가된 요소는 드래그하여 이동하고 우측 하단 핸들로 크기를 조절합니다.</p>
                  </div>
                  <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black flex-shrink-0">5</span>
                    <p className="text-sm leading-relaxed"><span className="text-white font-bold block mb-1">줌 및 정렬 도구</span>우측의 줌 컨트롤로 세밀하게 작업하고, 텍스트 정렬 기능을 활용해 완성도를 높이세요.</p>
                  </div>
                  <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black flex-shrink-0">6</span>
                    <p className="text-sm leading-relaxed"><span className="text-white font-bold block mb-1">고화질 저장</span>원하는 포맷(PNG, JPG, WEBP)을 선택하여 최종 결과물을 다운로드하세요.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition shadow-xl shadow-indigo-600/30"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      <input type="file" ref={elementImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleElementImageUpload(e.target.files[0])} />

      <style>{`
        .bg-pattern { background-image: radial-gradient(#1e1e24 1.5px, transparent 1.5px); background-size: 32px 32px; } 
        .cursor-crosshair { cursor: crosshair !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .cubic-bezier { transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
