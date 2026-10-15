import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight,
} from 'lucide-react';

// ─── Lightbox ─────────────────────────────────────────────────────────────────

export function Lightbox({ images, initialIndex, name, room, year, onClose }: {
  images: string[];
  initialIndex: number;
  name: string;
  room?: string;
  year?: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const valid = images.filter(i => i?.trim());

  // magnifier state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLDivElement>(null);

  // pinch zoom
  const lastPinchDist = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // reset zoom quando cambia foto
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsMagnifying(false);
  }, [idx]);

  // scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (zoom > 1) { setZoom(1); setOffset({ x: 0, y: 0 }); } else onClose(); }
      if (e.key === 'ArrowRight' && zoom === 1) setIdx(p => (p + 1) % valid.length);
      if (e.key === 'ArrowLeft' && zoom === 1) setIdx(p => (p - 1 + valid.length) % valid.length);
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setOffset({ x: 0, y: 0 }); return nz; });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [valid.length, onClose, zoom]);

  // mouse move per magnifier lente
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    if (isDragging && zoom > 1) {
      setOffset(prev => ({
        x: prev.x + (e.clientX - dragStart.x) / zoom,
        y: prev.y + (e.clientY - dragStart.y) / zoom,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleDoubleClick = () => {
    if (zoom > 1) { setZoom(1); setOffset({ x: 0, y: 0 }); }
    else { setZoom(2.5); }
  };

  // touch pinch zoom + swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastPinchDist.current;
      lastPinchDist.current = dist;
      setZoom(z => Math.max(1, Math.min(4, z * delta)));
    } else if (e.touches.length === 1 && zoom > 1) {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      setOffset(prev => ({ x: prev.x + dx / zoom, y: prev.y + dy / zoom }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom === 1 && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx < 0) setIdx(p => (p + 1) % valid.length);
        else setIdx(p => (p - 1 + valid.length) % valid.length);
      }
    }
    if (zoom <= 1) setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] bg-[#1a1208] flex flex-col select-none"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-[11px] font-bold uppercase tracking-widest"
        >
          <ChevronLeft size={14} /> Torna all'oggetto
        </button>
        <div className="flex items-center gap-3">
          {/* Zoom controls desktop */}
          <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-full px-1 py-1">
            <button
              onClick={() => { setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setOffset({ x: 0, y: 0 }); return nz; })}}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 text-lg font-bold"
            >−</button>
            <span className="text-white/60 text-[11px] font-bold min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 text-lg font-bold"
            >+</button>
          </div>
          {/* Magnifier toggle desktop */}
          <button
            onClick={() => setIsMagnifying(m => !m)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${isMagnifying ? 'bg-heritage-gold text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
            title="Lente di ingrandimento"
          >
            🔍 Lente
          </button>
          <span className="text-white/60 text-[13px] font-bold">{idx + 1} / {valid.length}</span>
        </div>
      </div>

      {/* Foto principale */}
      <div
        ref={imgRef}
        className="flex-1 flex items-center justify-center px-4 min-h-0 relative overflow-hidden"
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : isMagnifying ? 'none' : 'zoom-in' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={valid[idx]}
            alt={name}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            style={{
              maxHeight: 'calc(100vh - 260px)',
              transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              pointerEvents: 'none',
            }}
            draggable={false}
          />
        </AnimatePresence>

        {/* Lente desktop */}
        {isMagnifying && zoom === 1 && (
          <div
            className="hidden md:block absolute pointer-events-none rounded-full border-2 border-heritage-gold shadow-2xl overflow-hidden"
            style={{
              width: 180,
              height: 180,
              left: `calc(${mousePos.x}% - 90px)`,
              top: `calc(${mousePos.y}% - 90px)`,
              backgroundImage: `url(${valid[idx]})`,
              backgroundSize: '400%',
              backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {/* Hint doppio tap mobile */}
        {zoom === 1 && (
          <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-[11px]">
            Doppio tap per zoom
          </div>
        )}

        {/* Frecce */}
        {valid.length > 1 && zoom === 1 && (
          <>
            <button onClick={() => setIdx(p => (p - 1 + valid.length) % valid.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setIdx(p => (p + 1) % valid.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Info oggetto */}
      <div className="px-6 py-2 flex-shrink-0 text-center">
        <p className="font-serif italic text-white text-lg leading-tight">{name}</p>
        {(room || year) && (
          <p className="font-serif italic text-heritage-gold/70 text-[12px] mt-0.5">
            {[room, year].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Dots */}
      {valid.length > 1 && (
        <div className="flex justify-center items-center gap-2 pb-2 flex-shrink-0">
          <span className="font-serif italic text-white/30 text-[11px] mr-1">scorri</span>
          {valid.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === idx ? 'bg-heritage-gold w-5 h-1.5' : 'bg-white/25 w-1.5 h-1.5'}`} />
          ))}
        </div>
      )}

      {/* Miniature */}
      {valid.length > 1 && (
        <div className="flex gap-2 justify-center px-4 pb-6 flex-shrink-0">
          {valid.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${i === idx ? 'border-heritage-gold scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}>
              <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
