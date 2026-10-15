import React, { useState, FormEvent, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, Sparkles, Camera, Upload, Trash2, Image as ImageIcon,
} from 'lucide-react';
import { HeritageItem } from '../types.ts';
import { CAT_MAP } from './CatawikiModal';
import { analyzeImageWithClaude } from '../lib/ai';
import { uploadImage } from '../lib/remote';
import { emptyForm, genId, resizeImage } from '../lib/shared';

export function MobileDetailsSection({ form, setForm, handleDetailImages }: { form: any; setForm: any; handleDetailImages: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-heritage-ink/8 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-5 py-4 bg-heritage-cream/40">
        <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/85">Dettagli aggiuntivi</span>
        <ChevronRight size={16} className={`text-heritage-gold transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="p-5 space-y-4 border-t border-heritage-ink/8 bg-heritage-cream/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Anno</label><input value={form.year} onChange={e => setForm((p: any) => ({ ...p, year: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="Es. 1850" /></div>
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Prezzo</label><input value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="€ 500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Prezzo di riferimento <span className="text-heritage-ink/30 normal-case font-normal tracking-normal">(solo admin)</span></label><input value={form.estimatedValue} onChange={e => setForm((p: any) => ({ ...p, estimatedValue: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="€ 1.500" /></div>
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Prezzo display <span className="text-heritage-ink/30 normal-case font-normal tracking-normal">(visibile al pubblico)</span></label><input value={(form as any).displayPrice || ''} onChange={e => setForm((p: any) => ({ ...p, displayPrice: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="Da definire / Su richiesta / € 350" /></div>
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Codice SKU</label><input value={form.productCode} onChange={e => setForm((p: any) => ({ ...p, productCode: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="ART-001" /></div>
          </div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Dimensioni</label><input value={form.dimensions} onChange={e => setForm((p: any) => ({ ...p, dimensions: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="120×60×80 cm" /></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Dettagli tecnici</label><textarea value={form.technicalNotes} onChange={e => setForm((p: any) => ({ ...p, technicalNotes: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold resize-none h-20 text-lg font-heritage italic" placeholder="Materiali, stato..." /></div>

          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Stato</label><select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="Disponibile">Disponibile</option><option value="Riservato">Riservato</option><option value="Affidato">Affidato</option><option value="Non in Vendita">Non in Vendita</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Condizione</label><select value={form.wearCondition} onChange={e => setForm((p: any) => ({ ...p, wearCondition: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="">Non specificata</option><option value="Ottimo">Ottimo</option><option value="Buono">Buono</option><option value="Discreto">Discreto</option><option value="Da restaurare">Da restaurare</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Spedizione</label><select value={form.shipping} onChange={e => setForm((p: any) => ({ ...p, shipping: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="">Non specificata</option><option value="Ritiro in sede">Ritiro in sede</option><option value="Spedizione possibile">Spedizione possibile</option><option value="Solo ritiro">Solo ritiro</option><option value="Concordare">Concordare</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Destinazione</label><select value={form.destination} onChange={e => setForm((p: any) => ({ ...p, destination: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="Barberino">Barberino</option><option value="Cinisello Balsamo">Cinisello Balsamo (MI)</option><option value="Torino">Torino</option><option value="Sorella">Sorella</option><option value="Altro">Altro</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Tipo acquisizione</label><select value={form.acquisitionType} onChange={e => setForm((p: any) => ({ ...p, acquisitionType: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="Vendita">Vendita</option><option value="Lascito Affettivo">Lascito Affettivo</option><option value="Famiglia">Famiglia</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Link Catawiki</label><input value={form.catawikiUrl} onChange={e => setForm((p: any) => ({ ...p, catawikiUrl: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="https://www.catawiki.com/..." /></div>
          <div className="flex items-center gap-3 cursor-pointer py-1" onClick={() => setForm((p: any) => ({ ...p, isFeatured: !p.isFeatured }))}>
            <div className="relative flex-shrink-0"><div className={`w-10 h-5 rounded-full transition-colors ${form.isFeatured ? 'bg-heritage-gold' : 'bg-heritage-ink/10'}`} /><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} /></div>
            <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/85">In evidenza (Home)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ItemFormContent (top-level per evitare re-mount su iOS) ──────────────────

export function ItemFormContent({ form, setForm, isDragging, setIsDragging, isProcessingImage,
  isAnalyzing, detailImages, setDetailImages, uploadProgress, aiApplied,
  handleImageUpload, handleAddDetailImage, handleDetailImages, handleAnalyze,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isProcessingImage: boolean;
  isAnalyzing: boolean;
  detailImages: { base64: string; url: string; tipo: string }[];
  setDetailImages: React.Dispatch<React.SetStateAction<{ base64: string; url: string; tipo: string }[]>>;
  uploadProgress: { current: number; total: number } | null;
  aiApplied: Set<string>;
  handleImageUpload: (src: string | File) => void;
  handleAddDetailImage: (file: File, tipo: string) => void;
  handleDetailImages: (e: ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
}) {
  const Label = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{children}</span>
      {aiApplied.has(k) && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
    </div>
  );
  const inputCls = "w-full border-b border-heritage-ink/15 py-2.5 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink";
  const sectionTitle = (t: string) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-heritage-gold flex-shrink-0" />
      <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{t}</p>
      <div className="flex-1 h-px bg-heritage-ink/8" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── FOTO PRINCIPALE ─────────────────────────────────────────── */}
      <div>
        {sectionTitle('Foto')}
        <div className="rounded-2xl border-2 border-dashed border-heritage-ink/10 overflow-hidden bg-heritage-cream/20">
          {form.imageUrl ? (
            <div className="relative h-52">
              <img src={form.imageUrl} className={`absolute inset-0 w-full h-full object-cover ${isProcessingImage ? 'opacity-50 blur-sm' : ''}`} />
              {isProcessingImage && <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}
              <button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="absolute top-3 right-3 bg-white/90 text-heritage-ink px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow">Rimuovi</button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageUpload(f); }}
              className={`h-36 flex flex-col items-center justify-center gap-2 transition-colors ${isDragging ? 'bg-heritage-gold/10' : ''}`}>
              {isProcessingImage
                ? <><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /><p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/40">Elaborazione...</p></>
                : <Camera size={36} className="text-heritage-ink/20" />}
            </div>
          )}
          {!isProcessingImage && (
            <div className="grid grid-cols-2 border-t border-heritage-ink/8">
              <label className="flex flex-col items-center gap-1.5 py-3 cursor-pointer border-r border-heritage-ink/8 active:bg-heritage-cream/60">
                <Camera size={18} className="text-heritage-gold" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60">Scatta</span>
                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              </label>
              <label className="flex flex-col items-center gap-1.5 py-3 cursor-pointer active:bg-heritage-cream/60">
                <ImageIcon size={18} className="text-heritage-gold" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60">Galleria</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              </label>
            </div>
          )}
        </div>

        {/* Foto dettaglio */}
        {detailImages.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {detailImages.map((d, i) => (
              <div key={i} className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-heritage-ink/10"><img src={d.url} className="w-full h-full object-cover" /></div>
                <p className="text-[9px] uppercase tracking-wide font-bold text-heritage-ink/40 text-center mt-0.5 max-w-[64px] truncate">{d.tipo}</p>
                <button type="button" onClick={() => { setDetailImages(prev => prev.filter((_, j) => j !== i)); setForm(p => ({ ...p, images: p.images.filter(img => img !== d.url) })); }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><X size={8} className="text-white" /></button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {DETAIL_TYPES_IM.map(tipo => (
            <label key={tipo} className="flex items-center gap-1 px-2.5 py-1.5 bg-heritage-cream/60 rounded-full cursor-pointer active:bg-heritage-gold/20 border border-heritage-ink/8">
              <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60">{tipo}</span>
              <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddDetailImage(f, tipo); }} />
            </label>
          ))}
          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-heritage-gold/10 border border-heritage-gold/30 rounded-full cursor-pointer">
            <Upload size={11} className="text-heritage-gold" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-gold">Batch</span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleDetailImages} />
          </label>
        </div>
        {uploadProgress && (
          <div className="mt-2">
            <div className="h-1 bg-heritage-ink/8 rounded-full overflow-hidden"><div className="h-full bg-heritage-gold rounded-full transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} /></div>
            <p className="text-[10px] text-heritage-ink/40 mt-1 uppercase tracking-widest font-bold">{uploadProgress.current}/{uploadProgress.total} foto</p>
          </div>
        )}

        {/* Analizza con AI */}
        {form.imageUrl && (
          <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}
            className={`mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[12px] uppercase tracking-widest transition-all ${isAnalyzing ? 'bg-heritage-gold/20 text-heritage-gold cursor-wait' : 'bg-heritage-gold text-white shadow-md'}`}>
            {isAnalyzing
              ? <><div className="w-4 h-4 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />Analisi in corso...</>
              : <><Sparkles size={14} />Analizza con Claude</>}
          </button>
        )}
        {aiApplied.size > 0 && (
          <p className="text-[10px] text-heritage-gold font-bold uppercase tracking-widest text-center mt-2">
            ✦ {aiApplied.size} campi compilati dall'AI — i badge dorati indicano i campi aggiornati
          </p>
        )}
      </div>

      {/* ── DATI BASE ───────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Dati oggetto')}
        <div className="space-y-5">
          <div>
            <Label k="name">Nome *</Label>
            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Scrittoio in noce" />
          </div>
          <div>
            <Label k="category">Categoria *</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ITEM_CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c, catawikiCategory: CAT_MAP[c] || '' }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all ${form.category === c ? 'bg-heritage-ink text-white' : 'bg-heritage-ink/8 text-heritage-ink/60'}`}>
                  {c}{aiApplied.has('category') && form.category === c && <span className="ml-1 text-heritage-gold">✦</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label k="room">Stanza *</Label>
            <input required value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Salotto" />
          </div>
          <div>
            <Label k="description">Descrizione *</Label>
            <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none h-20`} style={{ fontSize: '16px' }} placeholder="Racconta la storia..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="year">Anno/Epoca</Label>
              <input value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. 1850 circa" />
            </div>
            <div>
              <Label k="dimensions">Dimensioni</Label>
              <input value={form.dimensions} onChange={e => setForm(p => ({ ...p, dimensions: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. 80×40×90 cm" />
            </div>
          </div>
          <div>
            <Label k="technicalNotes">Note tecniche</Label>
            <textarea value={form.technicalNotes} onChange={e => setForm(p => ({ ...p, technicalNotes: e.target.value }))} className={`${inputCls} resize-none h-16`} style={{ fontSize: '16px' }} placeholder="Materiali, tecnica, dettagli..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="wearCondition">Condizione</Label>
              <select value={form.wearCondition} onChange={e => setForm(p => ({ ...p, wearCondition: e.target.value as any }))} className={inputCls} style={{ fontSize: '16px' }}>
                <option value="">—</option>
                <option value="Ottimo">Ottimo</option>
                <option value="Buono">Buono</option>
                <option value="Discreto">Discreto</option>
                <option value="Da restaurare">Da restaurare</option>
              </select>
            </div>
            <div>
              <Label k="price">Prezzo</Label>
              <input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="€ 500" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SCHEDA CATAWIKI ─────────────────────────────────────────── */}
      <div>
        {sectionTitle('Scheda Catawiki')}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label k="catawikiTitle">Titolo annuncio</Label>
              <span className={`text-[10px] font-bold ${form.catawikiTitle.length > 60 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{form.catawikiTitle.length}/60</span>
            </div>
            <input value={form.catawikiTitle} onChange={e => setForm(p => ({ ...p, catawikiTitle: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Titolo ottimizzato per Catawiki..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="catawikiSubcategory">Sottocategoria</Label>
              <input value={form.catawikiSubcategory} onChange={e => setForm(p => ({ ...p, catawikiSubcategory: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Comò" />
            </div>
            <div>
              <Label k="catawikiStyle">Stile</Label>
              <input value={form.catawikiStyle} onChange={e => setForm(p => ({ ...p, catawikiStyle: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Luigi XVI" />
            </div>
            <div>
              <Label k="catawikiMaterial">Materiale</Label>
              <input value={form.catawikiMaterial} onChange={e => setForm(p => ({ ...p, catawikiMaterial: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Noce massello" />
            </div>
            <div>
              <Label k="catawikiCountry">Paese origine</Label>
              <input value={form.catawikiCountry} onChange={e => setForm(p => ({ ...p, catawikiCountry: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Italia" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label k="catawikiDescription">Descrizione catalogo</Label>
              <span className={`text-[10px] font-bold ${form.catawikiDescription.length > 500 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{form.catawikiDescription.length}/500</span>
            </div>
            <textarea value={form.catawikiDescription} onChange={e => setForm(p => ({ ...p, catawikiDescription: e.target.value }))} className={`${inputCls} resize-none h-28`} style={{ fontSize: '16px' }} placeholder="Descrizione formale stile asta..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'catawikiRestored', l: 'Restaurato' },
              { k: 'catawikiShippingAvailable', l: 'Spedizione' },
              { k: 'catawikiPickupAvailable', l: 'Ritiro' },
            ].map(({ k, l }) => (
              <div key={k} className="flex flex-col items-center gap-1.5 p-3 bg-heritage-cream/30 rounded-xl cursor-pointer"
                onClick={() => setForm(p => ({ ...p, [k]: !(p as any)[k] }))}>
                <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40">{l}</p>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${(form as any)[k] ? 'bg-[#7B1818]' : 'bg-heritage-ink/15'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as any)[k] ? 'translate-x-4' : ''}`} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Label k="catawikiWeight">Peso spedizione (kg)</Label>
            <input value={form.catawikiWeight} onChange={e => setForm(p => ({ ...p, catawikiWeight: e.target.value }))} type="number" step="0.1" className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. 12.5" />
          </div>
        </div>
      </div>

      {/* ── DETTAGLI VENDITA ─────────────────────────────────────────── */}
      <div>
        {sectionTitle('Vendita e logistica')}
        <div className="space-y-5">

          {/* Stato — pillole */}
          <div>
            <Label k="status">Stato</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['Disponibile', 'Riservato', 'Affidato', 'Venduto'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(p => ({ ...p, status: s }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                    form.status === s
                      ? s === 'Disponibile' ? 'bg-emerald-700 text-white border-emerald-700'
                      : s === 'Riservato' ? 'bg-heritage-gold text-white border-heritage-gold'
                      : s === 'Affidato' ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-heritage-ink text-white border-heritage-ink'
                      : 'bg-transparent text-heritage-ink/50 border-heritage-ink/15 hover:border-heritage-ink/30'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Canale — pillole */}
          <div>
            <Label k="acquisitionType">Canale</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['Vendita', 'Catawiki', 'Lascito Affettivo', 'Famiglia'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(p => ({ ...p, acquisitionType: t, ...(t === 'Famiglia' ? { status: 'Affidato' } : {}) }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                    form.acquisitionType === t
                      ? 'bg-heritage-gold text-white border-heritage-gold'
                      : 'bg-transparent text-heritage-ink/50 border-heritage-ink/15 hover:border-heritage-gold/40'
                  }`}>
                  {t === 'Lascito Affettivo' ? 'Adozione / Regalo' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Prezzi — sempre visibili, readonly se non disponibile/in vendita */}
          {(() => {
            const editable = form.status === 'Disponibile';
            const lockedLabel = form.status === 'Riservato' ? 'Riservato' : form.status === 'Affidato' ? 'In adozione' : form.status === 'Venduto' ? 'Venduto' : '';
            return (
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border ${editable ? 'bg-heritage-ink/3 border-heritage-ink/8' : 'bg-heritage-ink/5 border-heritage-ink/12 opacity-70'}`}>
                <div>
                  <Label k="price">Prezzo rif. <span className="text-heritage-ink/30 normal-case font-normal tracking-normal text-[10px]">(solo admin)</span></Label>
                  <input
                    value={form.price}
                    onChange={e => editable && setForm(p => ({ ...p, price: e.target.value }))}
                    readOnly={!editable}
                    className={`${inputCls} ${!editable ? 'cursor-not-allowed' : ''}`}
                    style={{ fontSize: '16px' }}
                    placeholder="€ 280–380"
                  />
                </div>
                <div>
                  <Label k="displayPrice">Prezzo display <span className="text-heritage-ink/30 normal-case font-normal tracking-normal text-[10px]">(pubblico)</span></Label>
                  <input
                    value={editable ? ((form as any).displayPrice || '') : lockedLabel}
                    onChange={e => editable && setForm(p => ({ ...p, displayPrice: e.target.value } as any))}
                    readOnly={!editable}
                    className={`${inputCls} ${!editable ? 'cursor-not-allowed text-heritage-ink/50 italic' : ''}`}
                    style={{ fontSize: '16px' }}
                    placeholder="Da definire / € 350"
                  />
                </div>
                {!editable && <p className="col-span-2 text-[10px] text-heritage-ink/40 italic">Prezzi non modificabili per oggetti {form.status.toLowerCase()}</p>}
              </div>
            );
          })()}

          {/* Logistica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="destination">Dove si trova</Label>
              <select value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value as any }))} className={inputCls} style={{ fontSize: '16px' }}>
                <option value="Barberino">Barberino</option>
                <option value="Torino">Torino</option>
                <option value="Cinisello Balsamo">Cinisello Balsamo</option>
                <option value="Sorella">Sorella</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
            <div>
              <Label k="shipping">Spedizione</Label>
              <select value={form.shipping} onChange={e => setForm(p => ({ ...p, shipping: e.target.value as any }))} className={inputCls} style={{ fontSize: '16px' }}>
                <option value="">—</option>
                <option value="Ritiro in sede">Ritiro in sede</option>
                <option value="Spedizione possibile">Spedizione possibile</option>
                <option value="Solo ritiro">Solo ritiro</option>
                <option value="Concordare">Concordare</option>
              </select>
            </div>
          </div>

          <div>
            <Label k="catawikiUrl">Link Catawiki</Label>
            <input value={form.catawikiUrl} onChange={e => setForm(p => ({ ...p, catawikiUrl: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="https://www.catawiki.com/..." />
          </div>
          <div>
            <Label k="productCode">Codice</Label>
            <input value={form.productCode} onChange={e => setForm(p => ({ ...p, productCode: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="ART-001" />
          </div>
          <div className="flex items-center gap-3 cursor-pointer pt-1" onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isFeatured ? 'bg-heritage-gold' : 'bg-heritage-ink/10'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-heritage-ink/50">In evidenza (Home)</span>
          </div>
          <div className="flex items-center gap-3 cursor-pointer pt-1" onClick={() => setForm((p: any) => ({ ...p, isImportant: !p.isImportant }))}>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${(form as any).isImportant ? 'bg-heritage-ink' : 'bg-heritage-ink/10'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${(form as any).isImportant ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-heritage-ink/50">Importante (sfondo nero catalogo)</span>
          </div>
        </div>
      </div>

      {/* ── GALLERY ──────────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Gallery foto')}
        <div className="flex flex-wrap gap-2">
          {form.images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group border border-heritage-ink/10">
              <img src={img} className="w-full h-full object-cover" />
              <button type="button" onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                className="absolute inset-0 bg-red-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100">
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
          ))}
          {form.images.length === 0 && (
            <p className="text-[12px] italic text-heritage-ink/40 w-full text-center py-6 border border-dashed border-heritage-ink/10 rounded-xl">Nessuna foto aggiuntiva</p>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── ItemModal ────────────────────────────────────────────────────────────────

export const ITEM_CATEGORIES = ['Mobili', 'Illuminazione', 'Sedute', 'Quadri', 'Porcellane', 'Tappeti', 'Giardino', 'Libri', 'Oggetti'];
export const DETAIL_TYPES_IM = ['Firma / timbro', 'Hardware / cerniere', 'Etichetta', 'Dettaglio decorativo', 'Materiale / legno', 'Stato conservazione', 'Altro'];

export function ItemModal({ isOpen, onClose, onSave, initialData, onDelete, nextOrder }: {
  isOpen: boolean; onClose: () => void; onSave: (item: HeritageItem) => Promise<void>;
  initialData?: HeritageItem | null; onDelete?: (id: string) => void; nextOrder: number;
}) {
  const [form, setForm] = useState({ ...emptyForm, order: nextOrder });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailImages, setDetailImages] = useState<{ base64: string; url: string; tipo: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [imageBase64ForAnalysis, setImageBase64ForAnalysis] = useState<string>('');
  const [aiApplied, setAiApplied] = useState<Set<string>>(new Set());
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => { if (e.changedTouches[0].clientY - touchStartY.current > 150) onClose(); };

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        name: initialData.name || '', description: initialData.description || '',
        room: initialData.room || '', category: initialData.category || '',
        year: initialData.year || '', dimensions: initialData.dimensions || '',
        status: initialData.status || 'Disponibile', acquisitionType: initialData.acquisitionType || 'Vendita',
        price: initialData.price || '', catawikiUrl: initialData.catawikiUrl || '',
        imageUrl: initialData.imageUrl || '', technicalNotes: initialData.technicalNotes || '',
        destination: initialData.destination || 'Barberino', estimatedValue: initialData.estimatedValue || '',
        productCode: initialData.productCode || '', wearCondition: initialData.wearCondition || '',
        shipping: initialData.shipping || '', isFeatured: initialData.isFeatured || false, isImportant: (initialData as any).isImportant || false,
        order: initialData.order ?? nextOrder, details: initialData.details || [], images: initialData.images || [],
        catawikiTitle: initialData.catawikiTitle || '', catawikiCategory: initialData.catawikiCategory || '',
        catawikiSubcategory: initialData.catawikiSubcategory || '', catawikiStyle: initialData.catawikiStyle || '',
        catawikiMaterial: initialData.catawikiMaterial || '', catawikiCountry: initialData.catawikiCountry || '',
        catawikiRestored: initialData.catawikiRestored || false, catawikiWeight: initialData.catawikiWeight || '',
        catawikiShippingAvailable: initialData.catawikiShippingAvailable || false,
        catawikiPickupAvailable: initialData.catawikiPickupAvailable ?? true,
        catawikiDescription: initialData.catawikiDescription || '',
        catawikiImages: initialData.catawikiImages || [],
        catawikiSpecific: (initialData as any).catawikiSpecific || {},
        displayPrice: (initialData as any).displayPrice || initialData.price || '',
      });
    } else {
      setForm({ ...emptyForm, order: nextOrder });
    }
    // Popola detailImages con le foto già caricate (URL GitHub) per rianalisi
    if (initialData?.images && initialData.images.length > 0) {
      setDetailImages(initialData.images.map((url, i) => ({
        base64: url, // URL — verrà convertito in base64 in analyzeImageWithClaude
        url,
        tipo: i === 0 ? 'Dettaglio' : `Foto ${i + 1}`,
      })));
    } else {
      setDetailImages([]);
    }
    setAiApplied(new Set());
    setImageBase64ForAnalysis('');
  }, [initialData, isOpen, nextOrder]);

  // ── Upload foto principale ──────────────────────────────────────────────────
  const handleImageUpload = async (src: string | File) => {
    setIsProcessingImage(true);
    try {
      const r = await resizeImage(src);
      setImageBase64ForAnalysis(r);
      if (src instanceof File) {
        const fileName = `${Date.now()}-${(src as File).name.replace(/[^a-z0-9.]/gi, '-')}`;
        const url = await uploadImage(r, fileName);
        if (url) { setForm(p => ({ ...p, imageUrl: url })); return; }
      }
      setForm(p => ({ ...p, imageUrl: r }));
    } catch { alert('Errore immagine.'); }
    finally { setIsProcessingImage(false); }
  };

  // ── Upload foto dettaglio ───────────────────────────────────────────────────
  const handleAddDetailImage = async (file: File, tipo: string) => {
    setIsProcessingImage(true);
    try {
      const r = await resizeImage(file);
      let url = r;
      {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
        url = await uploadImage(r, fileName) || r;
      }
      setDetailImages(prev => [...prev, { base64: r, url, tipo }]);
      setForm(p => ({ ...p, images: [...p.images, url] }));
    } catch {}
    finally { setIsProcessingImage(false); }
  };

  const handleDetailImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setIsProcessingImage(true);
    setUploadProgress({ current: 0, total: imageFiles.length });
    const imgs = [...form.images];
    const newDetailImgs: { base64: string; url: string; tipo: string }[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      setUploadProgress({ current: i + 1, total: imageFiles.length });
      try {
        const r = await resizeImage(imageFiles[i]);
        let url = r;
        {
          const fileName = `${Date.now()}-${imageFiles[i].name.replace(/[^a-z0-9.]/gi, '-')}`;
          url = await uploadImage(r, fileName) || r;
        }
        imgs.push(url);
        newDetailImgs.push({ base64: r, url, tipo: 'Galleria' });
      } catch { console.error(`Errore su ${imageFiles[i].name}`); }
    }
    setForm(p => ({ ...p, images: imgs }));
    setDetailImages(prev => [...prev, ...newDetailImgs]);
    setIsProcessingImage(false);
    setUploadProgress(null);
    e.target.value = '';
  };

  // ── Analisi AI unificata ────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!imageBase64ForAnalysis && !form.imageUrl) return;
    setIsAnalyzing(true);
    try {
      let mainBase64 = imageBase64ForAnalysis;
      if (!mainBase64 && form.imageUrl) {
        const res = await fetch(form.imageUrl);
        const blob = await res.blob();
        mainBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      const result = await analyzeImageWithClaude(mainBase64, detailImages.length > 0 ? detailImages : undefined);
      if (!result) { alert('Nessun risultato. Riprova con una foto più nitida.'); return; }
      const r = result as any;
      const applied = new Set<string>();
      setForm(p => {
        const updated = { ...p };
        // Campi base
        const baseFields = ['name','description','category','room','year','dimensions','price','technicalNotes','wearCondition'];
        baseFields.forEach(k => { if (r[k]) { (updated as any)[k] = r[k]; applied.add(k); } });
        // Campi Catawiki
        const catFields = ['catawikiTitle','catawikiSubcategory','catawikiStyle','catawikiMaterial','catawikiCountry','catawikiDescription','catawikiRestored'];
        catFields.forEach(k => { if (r[k] !== undefined && r[k] !== '') { (updated as any)[k] = r[k]; applied.add(k); } });
        if (r.category) updated.catawikiCategory = CAT_MAP[r.category] || p.catawikiCategory;
        return updated;
      });
      setAiApplied(applied);
    } catch (e: any) { alert('Errore AI: ' + e.message); }
    finally { setIsAnalyzing(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try { await onSave({ ...form, id: initialData?.id || genId(), stories: initialData?.stories || [], displayPrice: (form as any).displayPrice || '' } as any); }
    finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  // ── Helper field label con badge AI ────────────────────────────────────────
  const Label = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{children}</span>
      {aiApplied.has(k) && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
    </div>
  );

  const inputCls = "w-full border-b border-heritage-ink/15 py-2.5 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink";
  const sectionTitle = (t: string) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-heritage-gold flex-shrink-0" />
      <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{t}</p>
      <div className="flex-1 h-px bg-heritage-ink/8" />
    </div>
  );

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose} />

      {/* ── DESKTOP ── */}
      <motion.div key="desktop-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="hidden md:flex fixed inset-0 z-[101] items-center justify-center p-6 pointer-events-none">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl pointer-events-auto flex flex-col" style={{ maxHeight: '92vh' }}
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-8 py-5 border-b border-heritage-ink/8 flex items-center justify-between flex-shrink-0">
            <h3 className="text-2xl font-serif text-heritage-ink">{initialData ? `Modifica: ${initialData.name.split(' ').slice(0,4).join(' ')}` : 'Nuovo Oggetto'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
          </div>
          {/* Scrollable */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-8 py-6">
            <ItemFormContent
              form={form} setForm={setForm} isDragging={isDragging} setIsDragging={setIsDragging}
              isProcessingImage={isProcessingImage} isAnalyzing={isAnalyzing}
              detailImages={detailImages} setDetailImages={setDetailImages}
              uploadProgress={uploadProgress} aiApplied={aiApplied}
              handleImageUpload={handleImageUpload} handleAddDetailImage={handleAddDetailImage}
              handleDetailImages={handleDetailImages} handleAnalyze={handleAnalyze}
            />
            <div className="flex gap-4 pt-6 pb-2">
              {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-5 py-3.5 rounded-xl border border-red-100 text-red-500 text-sm font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} />Elimina</button>}
              <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* ── MOBILE ── */}
      <motion.div key="mobile-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
        style={{ maxHeight: '95svh', overflowX: 'hidden' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
        </div>
        {/* Header */}
        <div className="px-6 py-3 border-b border-heritage-ink/5 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-serif text-heritage-ink">{initialData ? `Modifica` : 'Nuovo Oggetto'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
        </div>
        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 pb-28">
          <ItemFormContent
              form={form} setForm={setForm} isDragging={isDragging} setIsDragging={setIsDragging}
              isProcessingImage={isProcessingImage} isAnalyzing={isAnalyzing}
              detailImages={detailImages} setDetailImages={setDetailImages}
              uploadProgress={uploadProgress} aiApplied={aiApplied}
              handleImageUpload={handleImageUpload} handleAddDetailImage={handleAddDetailImage}
              handleDetailImages={handleDetailImages} handleAnalyze={handleAnalyze}
            />
          <div className="flex gap-3 pt-6">
            {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-4 py-4 rounded-xl border border-red-100 text-red-500 text-sm font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /></button>}
            <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
