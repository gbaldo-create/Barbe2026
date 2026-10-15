import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Heart, Camera, Image as ImageIcon, Lamp, Sofa, BookOpen, Armchair,
  Star,
} from 'lucide-react';

// ─── ExplorePanel ─────────────────────────────────────────────────────────────

export const EXPLORE_CATEGORIES = [
  { name: 'Mobili',        icon: <Armchair size={22} /> },
  { name: 'Illuminazione', icon: <Lamp size={22} /> },
  { name: 'Sedute',        icon: <Sofa size={22} /> },
  { name: 'Quadri',        icon: <ImageIcon size={22} /> },
  { name: 'Libri',         icon: <BookOpen size={22} /> },
  { name: 'Altro',         icon: <Star size={22} /> },
];

export const EXPLORE_ROOMS = [
  { name: 'Salotto',    subtitle: 'dove ci si ritrovava',     match: (r: string) => /salotto|salone|sala|soggiorno/i.test(r) },
  { name: 'Studio',     subtitle: 'la scrivania di papà',     match: (r: string) => /studio/i.test(r) },
  { name: 'Camera',     subtitle: 'i cassettoni, gli armadi', match: (r: string) => /camera/i.test(r) },
  { name: 'Biblioteca', subtitle: 'i libri di Franco',        match: (r: string) => /biblioteca/i.test(r) },
  { name: 'Cucina',     subtitle: 'il tavolo grande',          match: (r: string) => /cucina|dispensa|cantina|ingresso|atrio|scala/i.test(r) },
];

export function ExplorePanel({
  isOpen, onClose, totalItems, categoriesWithCount, onExplore, mode = 'discover', isAdmin = false, favorites = [], showFavoritesOnly = false, onToggleFavoritesOnly,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalItems: number;
  categoriesWithCount: { name: string; count: number }[];
  onExplore: (opts: { category?: string; roomMatch?: (r: string) => boolean; catawikiOnly?: boolean }) => void;
  mode?: 'discover' | 'filter';
  isAdmin?: boolean;
  favorites?: string[];
  showFavoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
}) {
  const [selType, setSelType] = useState<'all' | 'category' | 'room' | 'catawiki'>('all');
  const [selCategory, setSelCategory] = useState<string | null>(null);
  const [selRoom, setSelRoom] = useState<string | null>(null);

  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 120) onClose();
  };

  const selectAll = () => { setSelType('all'); setSelCategory(null); setSelRoom(null); };
  const selectCat = (cat: string) => { setSelType('category'); setSelCategory(cat); setSelRoom(null); };
  const selectRoom = (room: string) => { setSelType('room'); setSelRoom(room); setSelCategory(null); };
  const selectCatawiki = () => { setSelType('catawiki'); setSelCategory(null); setSelRoom(null); };

  const handleConfirm = () => {
    if (selType === 'category' && selCategory) {
      onExplore({ category: selCategory });
    } else if (selType === 'room' && selRoom) {
      const roomDef = EXPLORE_ROOMS.find(r => r.name === selRoom);
      onExplore({ roomMatch: roomDef?.match });
    } else if (selType === 'catawiki') {
      onExplore({ catawikiOnly: true });
    } else {
      onExplore({});
    }
    onClose();
  };

  const countFor = (name: string) => categoriesWithCount.find(c => c.name === name)?.count ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ep-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-heritage-ink/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* ── MOBILE: bottom sheet ── */}
          <motion.div
            key="ep-sheet-mobile"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[210] bg-heritage-cream rounded-t-[24px] shadow-2xl flex flex-col"
            style={{ maxHeight: '92svh' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 flex-shrink-0">
              <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-4 flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="font-serif italic text-[26px] text-heritage-ink leading-tight">
                  {mode === 'discover' ? <><span>Da dove vuoi </span><span className="not-italic font-bold">iniziare?</span></> : 'Filtra'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelType('all'); setSelCategory(null); setSelRoom(null); }} className="text-[12px] font-bold uppercase tracking-widest text-heritage-gold">Reset</button>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-heritage-ink/8">
                  <X size={15} className="text-heritage-ink/50" />
                </button>
              </div>
            </div>

            <div className="h-px bg-heritage-ink/8 mx-6 flex-shrink-0" />

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-6 pt-4 pb-2 space-y-5">

              {/* CATEGORIE */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Categorie</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={selectAll}
                    className={`col-span-2 flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-[#4a5a38] border-[#4a5a38] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    <span>Tutti</span>
                    <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${selType === 'all' ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{totalItems}</span>
                  </button>
                  {EXPLORE_CATEGORIES.map(cat => {
                    const active = selType === 'category' && selCategory === cat.name;
                    return (
                      <button key={cat.name} onClick={() => selectCat(cat.name)}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                        <span>{cat.name}</span>
                        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{countFor(cat.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STATO */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stato</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={selectAll}
                    className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    Tutti
                  </button>
                  <button onClick={selectCatawiki}
                    className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'catawiki' ? 'bg-[#7B1818] border-[#7B1818] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    Su Catawiki
                  </button>
                </div>
              </div>

              {/* STANZE */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stanza</p>
                <div className="flex flex-wrap gap-2">
                  {EXPLORE_ROOMS.map(room => {
                    const active = selType === 'room' && selRoom === room.name;
                    return (
                      <button key={room.name} onClick={() => selectRoom(room.name)}
                        className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                        {room.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* CTA fisso in fondo */}
            <div className="px-6 pb-8 pt-4 flex-shrink-0 space-y-3">
              {isAdmin && favorites.length > 0 && onToggleFavoritesOnly && (
                <button onClick={() => { onToggleFavoritesOnly(); onExplore({}); onClose(); }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-bold text-[13px] uppercase tracking-[0.15em] transition-all ${showFavoritesOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                  <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                  I miei preferiti · {favorites.length}
                </button>
              )}
              <button onClick={handleConfirm}
                className="w-full flex items-center justify-center py-4 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-[0.2em] active:opacity-90 transition-opacity">
                Mostra Risultati
              </button>
            </div>

          </motion.div>
          {/* ── DESKTOP: modale centrata ── */}
          <motion.div
            key="ep-sheet-desktop"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="hidden md:flex fixed inset-0 z-[210] items-center justify-center pointer-events-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-heritage-cream rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">

              {/* Header */}
              <div className="px-8 pt-7 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-serif italic text-[28px] text-heritage-ink leading-tight">
                    {mode === 'discover'
                      ? <>Da dove vuoi <span className="not-italic font-bold">iniziare?</span></>
                      : 'Filtra'}
                  </h2>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => { setSelType('all'); setSelCategory(null); setSelRoom(null); }} className="text-[12px] font-bold uppercase tracking-widest text-heritage-gold">Reset</button>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-heritage-ink/8 hover:bg-heritage-ink/15 transition-colors">
                    <X size={15} className="text-heritage-ink/50" />
                  </button>
                </div>
              </div>

              <div className="border-t border-heritage-ink/8 mx-8" />

              <div className="px-8 pt-5 pb-7 space-y-5">

                {/* CATEGORIE */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Categorie</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={selectAll}
                      className={`col-span-2 flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-[#4a5a38] border-[#4a5a38] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                      <span>Tutti</span>
                      <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${selType === 'all' ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{totalItems}</span>
                    </button>
                    {EXPLORE_CATEGORIES.map(cat => {
                      const active = selType === 'category' && selCategory === cat.name;
                      return (
                        <button key={cat.name} onClick={() => selectCat(cat.name)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                          <span>{cat.name}</span>
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{countFor(cat.name)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STATO */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stato</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={selectAll}
                      className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                      Tutti
                    </button>
                    <button onClick={selectCatawiki}
                      className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'catawiki' ? 'bg-[#7B1818] border-[#7B1818] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                      Su Catawiki
                    </button>
                  </div>
                </div>

                {/* STANZE */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stanza</p>
                  <div className="flex flex-wrap gap-2">
                    {EXPLORE_ROOMS.map(room => {
                      const active = selType === 'room' && selRoom === room.name;
                      return (
                        <button key={room.name} onClick={() => selectRoom(room.name)}
                          className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                          {room.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                {isAdmin && favorites.length > 0 && onToggleFavoritesOnly && (
                  <button onClick={() => { onToggleFavoritesOnly(); onExplore({}); onClose(); }}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-bold text-[13px] uppercase tracking-[0.15em] transition-all ${showFavoritesOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                    I miei preferiti · {favorites.length}
                  </button>
                )}
                <button onClick={handleConfirm}
                  className="w-full flex items-center justify-center py-4 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-[0.2em] hover:bg-heritage-ink/90 transition-colors">
                  Mostra Risultati
                </button>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
