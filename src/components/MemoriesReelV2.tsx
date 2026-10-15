import React from 'react';
import {
  X, Maximize2,
} from 'lucide-react';
import { Lightbox } from './Lightbox';
import { REEL_AUTHORS, REEL_COLORS } from './MemoriesReel';
import { FamilyMemory } from '../lib/shared';

// ─── 🧪 Lab: ReelV2Photo ────────────────────────────────────────────────────
export function ReelV2Photo({ src, year }: { src: string; year?: string }) {
  const [isPortrait, setIsPortrait] = React.useState(false);
  const shortYear = year ? year.slice(0,4) : null;
  return (
    <div style={{ width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 20, flexShrink: 0, boxShadow: '0 8px 32px rgba(28,26,22,0.12)', border: '1px solid rgba(28,26,22,0.06)', height: isPortrait ? 'auto' : 260, maxHeight: 320, position: 'relative' }}>
      <img src={src} alt=""
        onLoad={e => { const img = e.currentTarget; setIsPortrait(img.naturalHeight > img.naturalWidth * 1.1); }}
        style={{ width: '100%', height: isPortrait ? 'auto' : '100%', display: 'block', objectFit: 'cover', objectPosition: 'center top' }} />
      {shortYear && (
        <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 48, fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,0.55)', fontFamily: '"Cormorant Garamond", "Cormorant", Georgia, serif', fontStyle: 'italic', letterSpacing: '-0.02em', userSelect: 'none', pointerEvents: 'none', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
          {shortYear}
        </div>
      )}
    </div>
  );
}

// ─── 🧪 Lab: MemoriesReelV2 — stile loader ───────────────────────────────────
// ─── Reel Cover — mosaico animato, una volta per sessione ───────────────────

export const REEL_COVER_STYLE = `
  @keyframes reelSlowZoom {
    from { transform: scale(1); }
    to   { transform: scale(1.06); }
  }
  @keyframes reelGrain {
    0%,100% { transform: translate(0,0); }
    10%  { transform: translate(-2%,-3%); }
    30%  { transform: translate(3%,2%); }
    50%  { transform: translate(-1%,4%); }
    70%  { transform: translate(4%,-1%); }
    90%  { transform: translate(-3%,3%); }
  }
  @keyframes reelFadeOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.04); }
  }
  @keyframes lightboxIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes colorize {
    0%   { filter: grayscale(100%) brightness(0.85); }
    100% { filter: grayscale(0%) brightness(1); }
  }
  @keyframes qfade {
    0%   { opacity: 0; transform: translateY(5px); }
    8%   { opacity: 1; transform: translateY(0); }
    28%  { opacity: 1; transform: translateY(0); }
    36%  { opacity: 0; transform: translateY(-5px); }
    100% { opacity: 0; }
  }
  @keyframes qfade1 {
    0%   { opacity: 1; transform: translateY(0); }
    28%  { opacity: 1; transform: translateY(0); }
    36%  { opacity: 0; transform: translateY(-5px); }
    100% { opacity: 0; }
  }
  .cover-q1 { animation: qfade1 7s ease-in-out infinite 0s; }
  .cover-q2 { animation: qfade 7s ease-in-out infinite 2.33s; }
  .cover-q3 { animation: qfade 7s ease-in-out infinite 4.66s; }
  .cover-cell::after {
    content: '';
    position: absolute; inset: 0;
    border: 2px solid transparent;
    transition: border-color 0.15s;
    pointer-events: none;
    z-index: 2;
  }
  .cover-cell:hover::after { border-color: transparent; }
  .cover-cell-info {
    position: absolute; bottom: 7px; left: 8px;
    z-index: 3; opacity: 0;
    transform: translateY(3px);
    transition: opacity 0.2s, transform 0.2s;
  }
  .cover-cell:hover .cover-cell-info { opacity: 1; transform: translateY(0); }
`;

export function ReelCover({ memories, onStart }: {
  memories: FamilyMemory[];
  onStart: (mem?: FamilyMemory) => void;
}) {
  const seed = React.useRef(Date.now()).current;

  // Seleziona 8 foto con foto, randomizzate
  const tiles: FamilyMemory[] = React.useMemo(() => {
    let s = seed;
    const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x7fffffff; };
    const withPhoto = memories.filter(m => m.imageUrl);
    return [...withPhoto].sort(() => rnd() - 0.5).slice(0, 9);
  }, [memories, seed]);

  // Frasi casuali dai ricordi con testo
  const quotes = React.useMemo(() => {
    const withText = memories.filter(m => m.text && m.text.length > 20 && m.text.length < 120);
    let s = seed ^ 0xbeef;
    const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x7fffffff; };
    const shuffled = [...withText].sort(() => rnd() - 0.5);
    return shuffled.slice(0, 3);
  }, [memories, seed]);

  // Layout fisso: 3 righe asimmetriche
  // Riga 1: [0 span2] [1]
  // Riga 2: [2] [3 span2]
  // Riga 3: [4] [5] [6]
  const LAYOUT: { idx: number; span2: boolean }[][] = [
    [{ idx: 0, span2: true }, { idx: 1, span2: false }],
    [{ idx: 2, span2: false }, { idx: 3, span2: true }],
    [{ idx: 4, span2: false }, { idx: 5, span2: false }, { idx: 6, span2: false }],
  ];

  const [visible, setVisible] = React.useState<Set<number>>(new Set());
  const [showButton, setShowButton] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);

  // Mostra il bottone quando almeno 5 foto sono caricate
  React.useEffect(() => {
    if (visible.size >= Math.min(5, tiles.length)) {
      const t = setTimeout(() => setShowButton(true), 400);
      return () => clearTimeout(t);
    }
  }, [visible.size, tiles.length]);

  const startWith = (mem?: FamilyMemory) => {
    setShowButton(false);
    setExiting(true);
    setTimeout(() => onStart(mem), 950);
  };

  // Swipe verso l'alto su tutta la cover
  const touchStartY = React.useRef<number>(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 60) startWith(); // swipe up > 60px
  };

  return (
    <>
      <style>{REEL_COVER_STYLE}</style>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', inset: 0, zIndex: 500, background: '#1C1A16', overflow: 'hidden',
          animation: exiting ? 'reelFadeOut 0.95s cubic-bezier(0.25,0.1,0.25,1) forwards' : 'none',
        }}
      >

        {/* ── MOSAICO ASIMMETRICO — layout esplicito senza buchi ── */}
        {(() => {
          const CELLS: { idx: number; col: string; row: string }[] = [
            { idx: 0, col: '1 / 3', row: '1 / 2' },
            { idx: 1, col: '3 / 4', row: '1 / 2' },
            { idx: 2, col: '1 / 2', row: '2 / 3' },
            { idx: 3, col: '2 / 4', row: '2 / 3' },
            { idx: 4, col: '1 / 2', row: '3 / 4' },
            { idx: 5, col: '2 / 3', row: '3 / 4' },
            { idx: 6, col: '3 / 4', row: '3 / 4' },
          ];
          return (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: 0,
              background: '#3A2E22',
            }}>
              {CELLS.map(({ idx, col, row }) => {
                const mem = tiles[idx % tiles.length];
                if (!mem) return null;
                const vis = visible.has(idx);
                return (
                  <div
                    key={idx}
                    className="cover-cell"
                    onClick={() => vis && startWith(mem)}
                    style={{
                      gridColumn: col, gridRow: row,
                      position: 'relative', overflow: 'hidden',
                      cursor: vis ? 'pointer' : 'default',
                    }}
                  >
                    <img
                      src={mem.imageUrl!}
                      alt=""
                      onLoad={() => setVisible(prev => new Set([...prev, idx]))}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        opacity: vis ? 1 : 0,
                        transition: 'opacity 0.65s cubic-bezier(0.25,0.1,0.25,1)',
                        animation: vis ? `reelSlowZoom ${12 + (idx % 3) * 4}s ease-in-out infinite alternate, colorize 2.5s cubic-bezier(0.4,0,0.2,1) ${idx * 0.12}s forwards` : 'none',
                        transformOrigin: 'center center',
                      }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,26,22,0.15)', pointerEvents: 'none' }} />
                    <div className="cover-cell-info">
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'white', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', display: 'block', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{mem.author}</span>
                      {mem.date && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', display: 'block', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{mem.date.slice(0,4)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── GRADIENTE SUPERIORE — sfuma verso le frasi ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '28%',
          background: 'linear-gradient(to bottom, rgba(28,26,22,0.78) 0%, rgba(28,26,22,0.25) 50%, rgba(28,26,22,0) 100%)',
          zIndex: 3, pointerEvents: 'none',
        }} />

        {/* ── GRADIENTE INFERIORE — sfuma verso titolo ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '26%',
          background: 'linear-gradient(to top, rgba(28,26,22,1) 0%, rgba(28,26,22,0.65) 55%, rgba(28,26,22,0) 100%)',
          zIndex: 3, pointerEvents: 'none',
        }} />

        {/* ── GRAIN ── */}
        <div style={{
          position: 'absolute', inset: '-30%', zIndex: 4, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px', opacity: 0.04,
          animation: 'reelGrain 0.8s steps(1) infinite', mixBlendMode: 'overlay' as const,
        }} />

        {/* ── TITOLO + BOTTONE ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0 24px', paddingBottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 64px))',
          gap: 14,
          opacity: showButton ? 1 : 0,
          transform: showButton ? 'translateY(0)' : 'translateY(24px)',
          filter: showButton ? 'blur(0px)' : 'blur(6px)',
          transition: 'opacity 1.1s cubic-bezier(0.25,0.1,0.25,1), transform 1.1s cubic-bezier(0.25,0.1,0.25,1), filter 1.1s cubic-bezier(0.25,0.1,0.25,1)',
          pointerEvents: showButton ? 'auto' : 'none',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 2px', fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>BARBERINO …./2026</p>
          <p ref={(el) => {
            if (!el) return;
            const fit = () => {
              const maxW = window.innerWidth - 100; // 50px padding per lato
              let size = 52;
              el.style.fontSize = size + 'px';
              while (el.scrollWidth > maxW && size > 20) {
                size -= 1;
                el.style.fontSize = size + 'px';
              }
            };
            fit();
            window.addEventListener('resize', fit);
          }} style={{ margin: 0, lineHeight: 1.1, textShadow: '0 4px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', fontSize: 52 }}>
            <span style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', color: 'white' }}>Le voci di </span>
            <span className="text-heritage-gold not-italic font-display font-bold tracking-tight">casa</span>
          </p>
          {/* Anni in morphing */}
          <canvas ref={(el) => {
            if (!el || (el as any)._morphRunning) return;
            (el as any)._morphRunning = true;
            const ctx2 = el.getContext('2d')!;
            const W2 = el.width, H2 = el.height;
            const ry = () => String(Math.floor(Math.random()*(2026-1870+1))+1870);
            let fr = ry(), to2 = ry(), pr = 0;
            const loop2 = () => {
              pr += 0.055; if(pr>=1){pr=0;fr=to2;to2=ry();}
              const e = pr<0.5?2*pr*pr:-1+(4-2*pr)*pr;
              ctx2.clearRect(0,0,W2,H2);
              ctx2.font='italic 32px Georgia,serif'; ctx2.textAlign='center'; ctx2.textBaseline='middle';
              ctx2.save();ctx2.globalAlpha=1-e;ctx2.filter=`blur(${(e*4).toFixed(1)}px)`;ctx2.fillStyle='rgba(255,255,255,0.65)';ctx2.fillText(fr,W2/2,H2/2);ctx2.restore();
              ctx2.save();ctx2.globalAlpha=e;ctx2.filter=`blur(${((1-e)*4).toFixed(1)}px)`;ctx2.fillStyle='rgba(255,255,255,0.65)';ctx2.fillText(to2,W2/2,H2/2);ctx2.restore();
              requestAnimationFrame(loop2);
            };
            loop2();
          }} width={160} height={44} style={{display:'block', marginTop:4, marginBottom:2}} />
          <button onClick={() => startWith()} style={{
            padding: '16px 44px', borderRadius: 100,
            border: '1px solid rgba(197,160,89,0.55)', background: 'rgba(197,160,89,0.32)',
            backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.9)', fontFamily: 'sans-serif',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
            cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>Sfoglia i ricordi</button>
        </div>

      </div>
    </>
  );
}

export function MemoriesReelV2({ memories, onClose }: { memories: FamilyMemory[]; onClose: () => void }) {
  const [activeAuthor, setActiveAuthor] = React.useState('Tutti');
  const [sortOrder, setSortOrder] = React.useState<'default' | 'asc' | 'desc'>('default');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = React.useState(0);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

  // Cover mosaico — sempre all'apertura
  const [showCover, setShowCover] = React.useState(true);
  const pendingMemId = React.useRef<string | null>(null);

  const filtered = React.useMemo(() => {
    const base = activeAuthor === 'Tutti' ? memories : memories.filter(m => m.author === activeAuthor);
    if (sortOrder === 'asc') return [...base].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (sortOrder === 'desc') return [...base].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return base;
  }, [memories, activeAuthor, sortOrder]);

  const handleCoverDone = (mem?: FamilyMemory) => {
    if (mem) pendingMemId.current = mem.id;
    setShowCover(false);
  };

  // Quando cover sparisce, scorri al ricordo tappato
  React.useEffect(() => {
    if (showCover) return;
    const id = pendingMemId.current;
    if (!id) return;
    pendingMemId.current = null;
    const pos = filtered.findIndex(m => m.id === id);
    if (pos < 0) return;
    setCurrent(pos);
    // Aspetta che il container sia visibile e rendered
    setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      el.style.scrollSnapType = 'none';
      el.scrollTop = pos * el.clientHeight;
      requestAnimationFrame(() => { el.style.scrollSnapType = 'y mandatory'; });
    }, 100);
  }, [showCover]);


  React.useEffect(() => {
    setCurrent(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [activeAuthor, sortOrder]);

  React.useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const handler = () => {
      const h = el.clientHeight;
      const idx = Math.round(el.scrollTop / h);
      if (idx >= filtered.length) {
        setCurrent(0);
        requestAnimationFrame(() => {
          el.style.scrollSnapType = 'none';
          el.scrollTop = 0;
          requestAnimationFrame(() => { el.style.scrollSnapType = 'y mandatory'; });
        });
      } else { setCurrent(idx); }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [filtered.length]);

  const scrollTo = (idx: number) => {
    const el = containerRef.current; if (!el) return;
    el.scrollTo({ top: idx * el.clientHeight, behavior: 'smooth' });
  };

  const color = (author: string) => REEL_COLORS[author] || '#8B6914';
  const ini = (author: string) => author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Cover mosaico — sopra tutto, zIndex 500, fixed inset-0 indipendente */}
      {showCover && window.innerWidth < 1024 && <ReelCover memories={memories} onStart={handleCoverDone} />}

    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '-30px', zIndex: 400, background: '#F5F0E8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header filtri — fuori dal flusso dello scroll */}
      <div style={{ flexShrink: 0, padding: '10px 12px', background: '#F2EDE3', borderBottom: '1px solid rgba(28,26,22,0.06)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(28,26,22,0.08)', border: 'none', color: '#1C1A16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', fontSize: 14 }}>←</button>
          {REEL_AUTHORS.map(a => {
            const active = activeAuthor === a;
            const c = REEL_COLORS[a];
            return (
              <button key={a} onClick={() => setActiveAuthor(a)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 100, border: `1px solid ${active ? (c || '#1C1A16') : 'rgba(28,26,22,0.15)'}`, cursor: 'pointer',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                background: active ? (c || '#1C1A16') : 'white',
                color: active ? 'white' : 'rgba(28,26,22,0.5)',
                whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {a}
              </button>
            );
          })}
          <button
            onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : s === 'desc' ? 'default' : 'asc')}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
              background: sortOrder !== 'default' ? '#1C1A16' : 'rgba(28,26,22,0.08)',
              color: sortOrder !== 'default' ? '#C5A059' : 'rgba(28,26,22,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '⇅'}
          </button>
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((_, i) => (
          <div key={i} onClick={() => scrollTo(i)} style={{ width: i === current ? 4 : 3, height: i === current ? 28 : 8, borderRadius: 100, background: i === current ? '#1C1A16' : 'rgba(28,26,22,0.2)', transition: 'all 0.3s', cursor: 'pointer' }} />
        ))}
      </div>

      {/* Frecce */}
      <div style={{ position: 'absolute', bottom: 'max(32px, env(safe-area-inset-bottom, 0px) + 16px)', right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button onClick={() => scrollTo(current === 0 ? filtered.length - 1 : current - 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(28,26,22,0.07)', border: 'none', color: '#1C1A16', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        <span style={{ color: 'rgba(28,26,22,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textAlign: 'center' as const }}>{current + 1}/{filtered.length}</span>
        <button onClick={() => scrollTo(current === filtered.length - 1 ? 0 : current + 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(28,26,22,0.07)', border: 'none', color: '#1C1A16', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
      </div>

      {/* Scroll container — inizia sotto la barra */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' as const, overscrollBehavior: 'none' }}>
        {filtered.map((mem, i) => {
          const c = color(mem.author);
          const av = ini(mem.author);
          const isHistoric = mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear();
          return (
            <div key={mem.id} style={{ height: '100%', width: '100%', flexShrink: 0, scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingLeft: 24, paddingRight: 24, paddingBottom: 90, boxSizing: 'border-box' as const, background: '#F5F0E8', minHeight: '100%' }}>
              {/* Foto con tap per fullscreen */}
              {mem.imageUrl && (
                <div onClick={() => setLightboxUrl(mem.imageUrl!)} style={{ cursor: 'zoom-in', position: 'relative' as const }}>
                  <ReelV2Photo src={mem.imageUrl || ''} year={mem.date?.slice(0,4)} />

                </div>
              )}
              {/* Senza foto — card colorata autore */}
              {!mem.imageUrl && (
                <div style={{ width: '100%', background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 20, padding: '28px 22px 22px', position: 'relative' as const }}>
                  <div style={{ fontSize: 72, lineHeight: 1, color: c, opacity: 0.2, fontFamily: 'Georgia,serif', position: 'absolute' as const, top: 10, left: 16 }}>"</div>
                  <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '22px 0 18px', textAlign: 'left' as const, width: '100%' }}>{mem.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${c}25`, paddingTop: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                      {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif', letterSpacing: '0.08em' }}>{mem.date?.slice(0,4)}</p>}
                    </div>
                  </div>
                </div>
              )}
              {mem.imageUrl && <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '0 0 20px', textAlign: 'left' as const, width: '100%' }}>{mem.text}</p>}
              {mem.imageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', borderTop: '1px solid rgba(28,26,22,0.08)', paddingTop: 14, width: '100%', marginTop: 4 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                  {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif', letterSpacing: '0.08em' }}>{mem.date?.slice(0,4)}</p>}
                </div>
              </div>
              )}
            </div>
          );
        })}
        {/* Clone primo per loop */}
        {filtered.length > 0 && (() => {
          const mem = filtered[0];
          const c = color(mem.author);
          const av = ini(mem.author);
          const isHistoric = mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear();
          return (
            <div key="v2-clone" style={{ height: '100%', width: '100%', flexShrink: 0, scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingLeft: 24, paddingRight: 24, paddingBottom: 90, boxSizing: 'border-box' as const, background: '#F5F0E8', minHeight: '100%' }}>
              {mem.imageUrl && (
                <div onClick={() => setLightboxUrl(mem.imageUrl!)} style={{ cursor: 'zoom-in', position: 'relative' as const }}>
                  <div style={{ width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', marginBottom: 24, flexShrink: 0, boxShadow: '0 8px 32px rgba(28,26,22,0.12)', border: '1px solid rgba(28,26,22,0.06)' }}>
                    <img src={mem.imageUrl} alt="" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 260, objectFit: 'contain' }} />
                  </div>
                  <div style={{ position: 'absolute' as const, bottom: 34, right: 10, background: 'rgba(28,26,22,0.5)', borderRadius: 8, padding: '5px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' as const }}>
                    <Maximize2 size={13} color="#C5A059" strokeWidth={2} />
                  </div>
                </div>
              )}
              {!mem.imageUrl && (
                <div style={{ width: '100%', background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 20, padding: '28px 22px 22px', position: 'relative' as const }}>
                  <div style={{ fontSize: 72, lineHeight: 1, color: c, opacity: 0.2, fontFamily: 'Georgia,serif', position: 'absolute' as const, top: 10, left: 16 }}>"</div>
                  <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '22px 0 18px', width: '100%' }}>{mem.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${c}25`, paddingTop: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                      {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,4)}</p>}
                    </div>
                  </div>
                </div>
              )}
              {mem.imageUrl && <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '0 0 20px', width: '100%' }}>{mem.text}</p>}
              {mem.imageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', borderTop: '1px solid rgba(28,26,22,0.08)', paddingTop: 16, width: '100%' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                  {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,4)}</p>}
                </div>
              </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>

    {/* Lightbox fullscreen */}
    {lightboxUrl && (
      <div
        onClick={() => setLightboxUrl(null)}
        style={{
          position: 'fixed' as const, inset: 0, zIndex: 9999,
          background: 'rgba(28,26,22,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          animation: 'lightboxIn 0.4s cubic-bezier(0.25,0.1,0.25,1)',
        }}
      >
        <button
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'absolute' as const, top: 20, right: 20,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(197,160,89,0.15)',
            border: '1px solid rgba(197,160,89,0.3)',
            color: '#C5A059', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>
        <img
          src={lightboxUrl}
          alt=""
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '100%', maxHeight: '90vh',
            borderRadius: 12, objectFit: 'contain',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    )}
    </>
  );
}
