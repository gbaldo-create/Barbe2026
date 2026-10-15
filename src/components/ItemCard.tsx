import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, ChevronLeft, ChevronRight, Heart, Image as ImageIcon,
} from 'lucide-react';
import { HeritageItem } from '../types.ts';
import { getAdozioneLabel, getPublicBadge, isAdozione } from '../lib/shared';

export interface ItemCardProps { item: HeritageItem; onClick: () => void; onToggleFavorite?: (id: string, e: React.MouseEvent) => void; onToggleFeatured?: (id: string, e: React.MouseEvent) => void; isAdmin?: boolean; aspectClassName?: string; imageHeightRatio?: string; isFeaturedCard?: boolean; showFeaturedBadge?: boolean; isHighlight?: boolean; }

export function ItemCard({ item, onClick, onToggleFavorite, onToggleFeatured, isAdmin, aspectClassName = 'aspect-[3/4]', imageHeightRatio, isFeaturedCard, showFeaturedBadge, isHighlight }: ItemCardProps) {
  return (
    <motion.div onClick={onClick} whileHover={{ y: -5, transition: { type: 'spring', stiffness: 320, damping: 24 } }} className={`group cursor-pointer overflow-hidden flex flex-col h-full w-full ${isFeaturedCard ? 'heritage-card border-none shadow-xl' : isHighlight ? 'heritage-card shadow-xl' : 'heritage-card'}`}>
      <div className={`overflow-hidden relative shrink-0 w-full ${imageHeightRatio ? '' : aspectClassName}`} style={imageHeightRatio ? { height: imageHeightRatio } : { aspectRatio: '3/4' }}>
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
        {isFeaturedCard && (
          <div className="absolute inset-0 flex flex-col justify-end">
            {/* Strong gradient always on mobile, hover on desktop */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500" />
            {/* Blur pill behind text — mobile only */}
            <div className="relative z-10 p-4 lg:p-8 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">
              <div className="md:hidden absolute inset-0 backdrop-blur-[2px] bg-black/10 rounded-b-2xl" />
              <div className="relative">
                <h4 className="text-white font-serif leading-[1.2] mb-1 text-xl lg:text-3xl">{item.name}</h4>
                <p className="text-heritage-gold text-[17px] lg:text-[18px] uppercase tracking-[0.2em] font-bold delay-75">{getAdozioneLabel(item) ?? ((item as any).displayPrice || 'Su Richiesta')}</p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-2">
          {onToggleFavorite && <button onClick={e => onToggleFavorite(item.id, e)} className={`p-2 rounded-full transition-all backdrop-blur-md border ${item.isFavorite ? 'bg-red-500/80 border-red-400 text-white shadow-lg' : 'bg-black/30 border-white/20 text-white/80'}`}><Heart size={14} fill={item.isFavorite ? 'currentColor' : 'none'} /></button>}
          {showFeaturedBadge && onToggleFeatured && <button onClick={e => onToggleFeatured(item.id, e)} className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shadow-sm transition-all ${item.isFeatured ? 'bg-heritage-gold/90 text-white' : 'bg-black/20 text-white/40 border border-white/15'}`}>★</button>}
          {item.productCode && <span className="bg-heritage-gold text-white px-2 md:px-3 py-1 rounded-full text-[11px] md:text-[11px] uppercase tracking-widest font-bold border border-white/20 shadow-lg">ID: {item.productCode}</span>}


        </div>
        {/* Badge in basso a sinistra — disponibilità + catawiki */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {item.catawikiUrl && <a href={item.catawikiUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="bg-[#7B1818]/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold">Catawiki</a>}
          {(() => {
            const b = getPublicBadge(item.status, (item as any).acquisitionType);
            const isAvail = b.label === 'Disponibile';
            return isAvail
              ? <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              : <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold ${b.cls}`}>{b.label}</span>;
          })()}
        </div>
      </div>
      <div className={`p-3 md:p-5 flex flex-col flex-grow ${item.catawikiUrl ? "bg-[#7B1818] text-white" : (item.isFeatured || (item as any).isImportant) ? "bg-heritage-ink text-white" : ""}`}>
        <span className="text-[11px] md:text-[12px] uppercase tracking-widest font-bold text-heritage-gold block mb-1">{item.category}</span>
        <h3 className={`text-[16px] md:text-xl font-serif leading-tight mb-2 line-clamp-3 w-[70%] md:w-full ${isHighlight ? 'text-white' : ''}`}>{item.name}</h3>
        <div className={`flex items-center gap-1.5 text-[12px] md:text-sm mb-3 font-medium ${item.catawikiUrl ? 'text-white/50' : item.isFeatured ? 'text-white/50' : 'text-heritage-ink/80'}`}><MapPin size={10} /><span className="truncate">{item.room}</span></div>
        <div className={`flex items-center justify-between text-heritage-gold pt-3 mt-auto ${isHighlight ? 'border-t border-heritage-gold/30' : 'border-t border-heritage-ink/5'}`}>
          <div className="flex flex-col">
            {!item.catawikiUrl && !isAdozione(item) && (item as any).displayPrice && (
              <span className={`text-[12px] md:text-sm font-serif italic mb-1 ${isHighlight ? 'text-heritage-gold' : 'text-heritage-ink/70'}`}>
                {(item as any).displayPrice}
              </span>
            )}
            <span className={`text-[11px] md:text-[12px] font-bold uppercase tracking-widest opacity-60 ${isHighlight ? "text-white" : ""}`}>Dettagli</span>
          </div>
          <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}

export function ImageGallery({ images, name, status, acquisitionType, catawikiUrl, onOpenLightbox }: { images: string[]; name: string; status: string; acquisitionType?: string; catawikiUrl?: string; onOpenLightbox?: (index: number) => void }) {
  const [idx, setIdx] = useState(0);
  const valid = useMemo(() => images.filter(i => i?.trim()), [images]);
  if (!valid.length) return <div className="w-full aspect-[3/4] bg-heritage-ink/5 flex items-center justify-center rounded-2xl"><ImageIcon className="text-heritage-ink/20" size={48} /></div>;
  return (
    <div className="space-y-4">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-heritage-ink/5 bg-white relative group">
        <AnimatePresence mode="wait"><motion.img key={idx} src={valid[idx]} alt={name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-full object-cover" /></AnimatePresence>
        {/* Click to open lightbox */}
        {onOpenLightbox && (
          <div
            className="absolute inset-0 cursor-zoom-in z-10"
            onClick={() => onOpenLightbox(idx)}
          />
        )}
        <div className="absolute top-6 left-6 z-20 flex flex-col items-start gap-4">
          {(() => { const b = getPublicBadge(status, acquisitionType); return (b.label === 'Disponibile' || b.label === 'In adozione') ? <span className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-full"><span className="relative flex w-1.5 h-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" /></span><span className="text-white/80 text-[9px] font-bold uppercase tracking-wider">{b.label}</span></span> : <span className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold ${b.cls}`}>{b.label}</span>; })()}
          {catawikiUrl && <span className="bg-[#7B1818] text-white px-4 py-2 rounded-full text-[12px] uppercase tracking-[0.2em] font-bold animate-pulse">su Catawiki</span>}
        </div>
        {valid.length > 1 && (<>
          <button onClick={e => { e.stopPropagation(); setIdx(p => (p - 1 + valid.length) % valid.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronLeft size={24} /></button>
          <button onClick={e => { e.stopPropagation(); setIdx(p => (p + 1) % valid.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronRight size={24} /></button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">{valid.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />)}</div>
        </>)}
      </div>
      {valid.length > 1 && <div className="flex gap-2 overflow-x-auto py-2">{valid.map((img, i) => <button key={i} onClick={() => setIdx(i)} className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-heritage-gold scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={img} alt={`${name} ${i}`} className="w-full h-full object-cover" /></button>)}</div>}
    </div>
  );
}
