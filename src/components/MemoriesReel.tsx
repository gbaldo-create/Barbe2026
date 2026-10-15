import React from 'react';
import { FamilyMemory } from '../lib/shared';

// build Fri May 22 12:06:43 UTC 2026

// deploy 20260520142743

// ─── 🧪 Lab: ReelPhotoCard ──────────────────────────────────────────────────────
export function ReelPhotoCard({ src }: { src: string }) {
  const [imgH, setImgH] = React.useState(55);
  const [isLandscape, setIsLandscape] = React.useState(false);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    const landscape = ratio > 1.3;
    setIsLandscape(landscape);
    setImgH(55);
  };
  return (
    <div style={{ height: `${imgH}%`, overflow: 'hidden', flexShrink: 0, position: 'relative', transition: 'height 0.3s ease' }}>
      <img src={src} alt="" onLoad={onLoad} style={{
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: 'center top',
      }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, transparent 0%, rgba(28,26,22,0.6) 50%, #1C1A16 90%, #1C1A16 100%)' }} />
    </div>
  );
}

// ─── 🧪 Lab: MemoriesReelView ────────────────────────────────────────────────
export const REEL_COLORS: Record<string, string> = { Emanuela: '#8B6914', Aleria: '#2D5016', Olivia: '#1A3A5C' };
export const REEL_AUTHORS = ['Tutti', 'Emanuela', 'Aleria', 'Olivia'];

export function MemoriesReelView({ memories, onClose }: { memories: FamilyMemory[]; onClose: () => void }) {
  const [activeAuthor, setActiveAuthor] = React.useState('Tutti');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = React.useState(0);

  const filtered = React.useMemo(() =>
    activeAuthor === 'Tutti' ? memories : memories.filter(m => m.author === activeAuthor),
  [memories, activeAuthor]);

  React.useEffect(() => {
    setCurrent(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [activeAuthor]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollTop / window.innerHeight);
      if (idx >= filtered.length) {
        // Card fantasma raggiunta — jump silenzioso al primo dopo un frame
        setCurrent(0);
        requestAnimationFrame(() => {
          el.style.scrollSnapType = 'none';
          el.scrollTop = 0;
          requestAnimationFrame(() => {
            el.style.scrollSnapType = 'y mandatory';
          });
        });
      } else {
        setCurrent(idx);
      }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' });
  };

  const color = (author: string) => REEL_COLORS[author] || '#8B6914';
  const ini = (author: string) => author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: '#1C1A16' }}>

      {/* Filtri autori */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '48px 16px 12px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
            ←
          </button>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {REEL_AUTHORS.map(a => {
              const active = activeAuthor === a;
              const c = REEL_COLORS[a];
              return (
                <button key={a} onClick={() => setActiveAuthor(a)} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  background: active ? (c || 'rgba(255,255,255,0.9)') : 'rgba(255,255,255,0.15)',
                  color: active ? (c ? 'white' : '#1C1A16') : 'rgba(255,255,255,0.7)',
                }}>
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((_, i) => (
          <div key={i} onClick={() => scrollTo(i)} style={{
            width: i === current ? 4 : 3,
            height: i === current ? 28 : 8,
            borderRadius: 100,
            background: i === current ? 'white' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.3s',
            cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Contatore + frecce */}
      <div style={{ position: 'absolute', bottom: 'max(40px, env(safe-area-inset-bottom, 0px) + 28px)', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => scrollTo(current === 0 ? filtered.length - 1 : current - 1)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', minWidth: 40, textAlign: 'center' as const }}>{current + 1} / {filtered.length}</span>
        <button onClick={() => scrollTo(current === filtered.length - 1 ? 0 : current + 1)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
      </div>

      {/* Scroll container */}
      <div ref={containerRef} style={{
        height: '100dvh', overflowY: 'scroll', overflowX: 'hidden',
        scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', overscrollBehavior: 'none',
      }}>
        {filtered.length === 0 ? (
          <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', gap: 16 }}>
            <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 20 }}>Nessun ricordo</p>
            <button onClick={onClose} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 100, color: 'white', cursor: 'pointer' }}>Torna indietro</button>
          </div>
        ) : filtered.map((mem, i) => {
          const c = color(mem.author);
          const av = ini(mem.author);
          const hasImg = !!mem.imageUrl;

          return (
            <div key={mem.id} style={{
              height: '100dvh', width: '100%', flexShrink: 0,
              scrollSnapAlign: 'start', scrollSnapStop: 'always',
              display: 'flex', flexDirection: 'column',
              background: hasImg ? '#1C1A16' : '#F2EDE3',
              position: 'relative',
            }}>
              {hasImg ? (
                <>
                  <ReelPhotoCard src={mem.imageUrl || ''} />
                  <div style={{ flex: 1, padding: '20px 24px 160px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,7)}</p>
                      </div>
                    </div>
                    {/* Anno discreto */}
                    {mem.date && (
                      <div style={{ position: 'absolute', top: 12, right: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
                        {mem.date.slice(0,4)}
                      </div>
                    )}
                    <p style={{ fontSize: mem.text.length > 200 ? 16 : mem.text.length > 120 ? 18 : 20, lineHeight: 1.65, color: 'rgba(255,255,255,0.92)', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0, position: 'relative', zIndex: 1 }}>{mem.text}</p>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 32px 120px', position: 'relative', overflow: 'hidden' }}>
                  {/* Sfondo tenue per autore */}
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 60%, ${c}08 0%, transparent 70%)` }} />
                  {/* Virgolettone */}
                  <div style={{ position: 'absolute', top: 180, left: 16, fontSize: 180, lineHeight: 1, color: c, opacity: 0.06, fontFamily: 'Georgia,serif', userSelect: 'none', pointerEvents: 'none' }}>"</div>
                  {/* Anno — solo se storico */}
                  {mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear() && (
                    <div style={{ position: 'absolute', bottom: 72, right: 24, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(28,26,22,0.15)', fontFamily: 'sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
                      {mem.date.slice(0,4)}
                    </div>
                  )}
                  {/* Autore */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: `0 2px 8px ${c}40` }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                      {mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear() && (
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date.slice(0,4)}</p>
                      )}
                    </div>
                  </div>
                  {/* Testo */}
                  <p style={{ fontSize: mem.text.length > 200 ? 19 : mem.text.length > 120 ? 22 : 27, lineHeight: 1.7, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0, position: 'relative', zIndex: 1 }}>{mem.text}</p>
                </div>
              )}
            </div>
          );
        })}
        {/* Card fantasma — clone del primo per loop infinito */}
        {filtered.length > 0 && (() => {
          const mem = filtered[0];
          const c = color(mem.author);
          const av = ini(mem.author);
          const hasImg = !!mem.imageUrl;
          return (
            <div key="loop-clone" style={{
              height: '100dvh', width: '100%', flexShrink: 0,
              scrollSnapAlign: 'start', scrollSnapStop: 'always',
              display: 'flex', flexDirection: 'column',
              background: hasImg ? '#1C1A16' : '#F2EDE3',
              position: 'relative',
            }}>
              {hasImg ? (
                <>
                  <ReelPhotoCard src={mem.imageUrl || ''} />
                  <div style={{ flex: 1, padding: '20px 24px 160px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,7)}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,0.92)', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0 }}>{mem.text}</p>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 28px 160px', position: 'relative' }}>
                  <div style={{ fontSize: 100, lineHeight: 1, color: c, opacity: 0.08, fontFamily: 'Georgia', position: 'absolute', top: 60, left: 20 }}>"</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,7)}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 21, lineHeight: 1.55, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0, position: 'relative', zIndex: 1 }}>{mem.text}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
