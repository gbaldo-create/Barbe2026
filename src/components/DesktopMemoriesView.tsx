import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Lightbox } from './Lightbox';
import { FamilyMemory } from '../lib/shared';

export const AUTHOR_COLORS: Record<string,string> = { Emanuela: '#C5A059', Olivia: '#4A8B6B', Aleria: '#7B6B9A', Gianmaria: '#6B4A8B' };

export function DesktopMemoriesView({ memories, loaderIndex, setLoaderIndex }: {
  memories: FamilyMemory[];
  loaderIndex: number;
  setLoaderIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [activeAuthor, setActiveAuthor] = React.useState('Tutti');
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const authors = ['Tutti', ...Array.from(new Set(memories.map(m => m.author).filter(Boolean)))];
  const filtered = activeAuthor === 'Tutti' ? memories : memories.filter(m => m.author === activeAuthor);
  const safeIdx = loaderIndex % Math.max(filtered.length, 1);
  const mem = filtered[safeIdx];

  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {authors.map(a => (
          <button key={a} onClick={() => { setActiveAuthor(a); setLoaderIndex(0); }}
            style={{ borderColor: activeAuthor === a ? (AUTHOR_COLORS[a] || '#1C1A16') : 'rgba(28,26,22,0.12)', background: activeAuthor === a ? (AUTHOR_COLORS[a] || '#1C1A16') : 'transparent', color: activeAuthor === a ? 'white' : 'rgba(28,26,22,0.5)' }}
            className="px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.14em] transition-all"
          >{a}</button>
        ))}
      </div>
      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={`${activeAuthor}-${safeIdx}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="flex flex-col items-center w-full gap-4">
          {mem?.imageUrl && (
            <div className="w-full rounded-2xl overflow-hidden border border-heritage-ink/10 cursor-zoom-in" style={{aspectRatio: '4/3'}} onClick={() => setLightboxUrl(mem.imageUrl!)}>
              <img src={mem.imageUrl} alt={mem.author || ""} className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-heritage-ink/90 text-lg font-heritage italic leading-relaxed text-center">"{mem?.text || ""}"</p>
          <div className="flex flex-col items-center gap-0.5">
            <p className="font-bold uppercase tracking-[0.2em] text-[12px]" style={{ color: AUTHOR_COLORS[mem?.author || ''] || '#C5A059' }}>— {mem?.author || ""}</p>
            {mem?.date && <p className="text-heritage-ink/40 text-[11px] uppercase tracking-widest">{mem.date}</p>}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-6">
        <button onClick={() => setLoaderIndex(i => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))} className="w-10 h-10 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors">
          <ChevronLeft size={18} className="text-heritage-ink/60" />
        </button>
        <span className="text-[11px] text-heritage-ink/30 font-sans tracking-widest">{safeIdx + 1} / {filtered.length}</span>
        <button onClick={() => setLoaderIndex(i => (i + 1) % Math.max(filtered.length, 1))} className="w-10 h-10 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors">
          <ChevronRight size={18} className="text-heritage-ink/60" />
        </button>
      </div>
    </div>
  );
}
