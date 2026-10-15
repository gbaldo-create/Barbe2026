import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, ArrowLeft, Sparkles, Camera, Upload, Trash2, Image as ImageIcon,
  Bookmark, PenLine,
} from 'lucide-react';
import { HeritageItem } from '../types.ts';
import { api, type SessionUser } from '../api';
import { saveMemoriesRemote, uploadImage } from '../lib/remote';
import { FamilyMemory, resizeImage } from '../lib/shared';

// ─── MemoryModal ──────────────────────────────────────────────────────────────

export function MemoryModal({
  isOpen, onClose, editingMemory, memories, items, onSave, onPinSave, onNotify, sessionUser, canEditAll
}: {
  isOpen: boolean;
  onClose: () => void;
  editingMemory: FamilyMemory | null;
  memories: FamilyMemory[];
  items: HeritageItem[];
  onSave: (memories: FamilyMemory[]) => void;
  onPinSave: (memories: FamilyMemory[]) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  sessionUser: SessionUser | null;
  canEditAll: boolean;
}) {
  // gli autori modificano solo i propri ricordi (stessa regola applicata dal server)
  const ownsMem = (m: FamilyMemory) => canEditAll || (!!sessionUser && ((m as any).createdBy
    ? (m as any).createdBy === sessionUser.username
    : (m.author || '').trim().toLowerCase() === sessionUser.displayName.trim().toLowerCase()));
  const [form, setForm] = React.useState({ text: '', author: '', date: new Date().toISOString().split('T')[0], itemId: '', imageUrl: '', visibility: 'public' as 'public' | 'private' });
  const [imageBase64, setImageBase64] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [rawText, setRawText] = React.useState('');
  const [view, setView] = React.useState<'list' | 'form'>('list');
  const [editId, setEditId] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) { setView('list'); setEditId(null); }
  }, [isOpen]);

  const openNew = () => {
    setForm({ text: '', author: sessionUser?.displayName || '', date: new Date().toISOString().split('T')[0], itemId: '', imageUrl: '', visibility: 'public' });
    setRawText(''); setImageBase64(''); setEditId(null); setView('form');
  };

  const openEdit = (m: FamilyMemory) => {
    setForm({ text: m.text, author: m.author, date: m.date, itemId: m.itemId || '', imageUrl: m.imageUrl || '', visibility: m.visibility || 'public' });
    setRawText(''); setImageBase64(''); setEditId(m.id); setView('form');
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);
    try {
      const resized = await resizeImage(file);
      setImageBase64(resized);
      setForm(f => ({ ...f, imageUrl: resized })); // show preview immediately
    } catch { console.error('Errore resize foto ricordo'); }
    setIsUploading(false);
  };

  const handleAI = async () => {
    if (!rawText.trim()) return;
    setIsAiLoading(true);
    try {
      const linkedItem = items.find(i => i.id === form.itemId);
      const prompt = `Sei un ghostwriter che aiuta a trasformare appunti personali in brevi ricordi familiari scritti bene.

Trasforma questo appunto grezzo in un ricordo scritto in prima persona, caldo e concreto:
"${rawText}"
${linkedItem ? `L'oggetto associato è: ${linkedItem.name}` : ''}

Regole:
- 3-5 frasi, tono personale e diretto
- Prima persona singolare
- Concreto — luoghi, gesti, dettagli visivi
- Niente retorica sentimentale, no aggettivi come "indimenticabile" o "prezioso"
- Se c'è un oggetto associato, citalo naturalmente senza enfasi
- Lingua italiana

Rispondi SOLO con il testo del ricordo, nessun'altra parola.`;

      const res = await api.ai({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setForm(f => ({ ...f, text: data.content?.[0]?.text?.trim() || f.text }));
      else onNotify(data.error?.message || 'AI non disponibile', 'error');
    } catch { onNotify('AI non raggiungibile', 'error'); }
    setIsAiLoading(false);
  };

  const handleSave = async () => {
    if (!form.text.trim() || !form.author.trim()) return;
    setIsUploading(true);
    let imageUrl = form.imageUrl;
    // Upload if we have a new base64 image (not already a remote URL)
    const needsUpload = imageBase64 && imageBase64.startsWith('data:');
    if (needsUpload) {
      const fileName = `memory_${Date.now()}.jpg`;
      const uploaded = await uploadImage(imageBase64, fileName);
      if (uploaded) imageUrl = uploaded;
      // If no token, keep the base64 as local preview but warn
      else if (!imageUrl || imageUrl.startsWith('data:')) imageUrl = imageBase64;
    }
    const mem: FamilyMemory = {
      id: editId || `mem_${Date.now()}`,
      text: form.text.trim(),
      author: form.author.trim(),
      date: form.date,
      itemId: form.itemId || undefined,
      imageUrl: imageUrl || undefined,
      visibility: form.visibility,
    };
    const updated = editId ? memories.map(m => m.id === editId ? { ...m, ...mem } : m) : [...memories, mem];
    const r = await saveMemoriesRemote(memories, updated);
    setIsUploading(false);
    if (!r.ok) { onNotify(r.error, 'error'); return; }
    onSave(r.data);
    onNotify('Ricordo salvato ✓');
    setView('list');
  };

  const handleDelete = async (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    const r = await saveMemoriesRemote(memories, updated);
    if (!r.ok) { onNotify(r.error, 'error'); return; }
    onSave(r.data);
    onNotify('Ricordo eliminato ✓');
  };

  const handlePin = async (id: string) => {
    // Toggle: se è già pinned lo unpinna, altrimenti lo pinna (e rimuove il pin dagli altri)
    const isCurrentlyPinned = memories.find(m => m.id === id)?.pinned;
    const updated = memories.map(m => ({
      ...m,
      pinned: isCurrentlyPinned ? false : m.id === id,
    }));
    const r = await saveMemoriesRemote(memories, updated);
    if (!r.ok) { onNotify(r.error, 'error'); return; }
    onPinSave(r.data); // non chiude la modale
    onNotify(isCurrentlyPinned ? 'Cover rimossa ✓' : '📌 Cover impostata ✓');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div key="mem-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — sale dal basso su mobile, centrata su desktop */}
      <div key="mem-sheet"
        className="fixed bottom-0 left-0 right-0 z-[301] bg-heritage-cream rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '95svh', touchAction: 'pan-y', transform: 'translateZ(0)', animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards', overflowX: 'hidden' }}
        onClick={e => e.stopPropagation()}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
            <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 md:py-4 border-b border-heritage-ink/8 flex-shrink-0">
            <div className="flex items-center gap-3">
              {view === 'form' && (
                <button onClick={() => setView('list')} className="p-1.5 hover:bg-heritage-ink/8 rounded-full transition-colors">
                  <ArrowLeft size={18} className="text-heritage-ink/60" />
                </button>
              )}
              <h2 className="text-lg font-serif italic text-heritage-ink">
                {view === 'list' ? 'Ricordi di famiglia' : editId ? 'Modifica ricordo' : 'Nuovo ricordo'}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-heritage-ink/8 rounded-full transition-colors flex-shrink-0">
              <X size={18} className="text-heritage-ink/60" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden" style={{overflowX:'hidden'}} onTouchMove={e => e.stopPropagation()}>
            {view === 'list' ? (
              <div className="flex flex-col gap-3">
                <button onClick={openNew} className="flex items-center gap-2 bg-heritage-gold text-white px-4 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider w-fit">
                  <Plus size={14} /> Nuovo ricordo
                </button>
                {memories.length === 0 && (
                  <p className="text-heritage-ink/40 italic text-sm mt-4">Nessun ricordo ancora. Aggiungine uno!</p>
                )}
                {memories.map(m => {
                  const linked = items.find(i => i.id === m.itemId);
                  return (
                    <div key={m.id} className={`bg-white rounded-2xl border overflow-hidden ${m.pinned ? 'border-heritage-gold/50 ring-1 ring-heritage-gold/20' : 'border-heritage-ink/8'}`}>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="w-full h-32 object-cover" />}
                      <div className="p-4">
                        <p className="text-heritage-ink text-sm leading-relaxed mb-2 line-clamp-3">{m.text}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-heritage-gold text-[11px] font-bold">{m.author}</span>
                            <span className="text-heritage-ink/30 text-[11px] ml-2">{m.date}</span>
                            {linked && <span className="text-heritage-ink/40 text-[11px] ml-2">· {linked.name.split(' ').slice(0,3).join(' ')}</span>}
                            {m.pinned && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-heritage-gold/15 text-heritage-gold px-1.5 py-0.5 rounded-full">📌 Cover</span>}
                            {m.visibility === 'private'
                              ? <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-heritage-ink/8 text-heritage-ink/50 px-1.5 py-0.5 rounded-full">🔒 Famiglia</span>
                              : <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">🌐 Tutti</span>
                            }
                          </div>
                          <div className="flex items-center gap-1">
                            {canEditAll && (
                            <button
                              onClick={() => handlePin(m.id)}
                              title={m.pinned ? 'Rimuovi dalla cover' : 'Imposta come cover'}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${m.pinned ? 'bg-heritage-gold text-white shadow-sm' : 'text-heritage-ink/30 hover:text-heritage-gold hover:bg-heritage-gold/10'}`}
                            >
                              <Bookmark size={17} className={m.pinned ? 'fill-white' : ''} />
                            </button>
                            )}
                            {ownsMem(m) && (<>
                            <button onClick={() => openEdit(m)} title="Modifica" className="w-9 h-9 rounded-full flex items-center justify-center text-heritage-ink/40 hover:text-heritage-ink hover:bg-heritage-ink/8 transition-all">
                              <PenLine size={17} />
                            </button>
                            <button onClick={() => handleDelete(m.id)} title="Elimina" className="w-9 h-9 rounded-full flex items-center justify-center text-heritage-ink/25 hover:text-red-400 hover:bg-red-50 transition-all">
                              <Trash2 size={17} />
                            </button>
                            </>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Foto */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Foto (opzionale)</label>
                  <div className="rounded-2xl border-2 border-dashed border-heritage-ink/10 overflow-hidden bg-heritage-cream/20">
                    {(imageBase64 || form.imageUrl) ? (
                      <div className="relative h-44">
                        <img src={imageBase64 || form.imageUrl} alt="" className={`absolute inset-0 w-full h-full object-cover ${isUploading ? 'opacity-50 blur-sm' : ''}`} />
                        {isUploading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-7 h-7 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}
                        <button type="button" onClick={() => { setImageBase64(''); setForm(f => ({ ...f, imageUrl: '' })); }} className="absolute top-2 right-2 bg-white/90 text-heritage-ink px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow">Rimuovi</button>
                      </div>
                    ) : (
                      <div className="h-28 flex flex-col items-center justify-center gap-2 text-heritage-ink/30">
                        {isUploading
                          ? <><div className="w-7 h-7 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /><p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40">Elaborazione...</p></>
                          : <Camera size={28} />}
                      </div>
                    )}
                    {!isUploading && (
                      <div className="grid grid-cols-2 border-t border-heritage-ink/8">
                        <label className="flex flex-col items-center gap-1 py-2.5 cursor-pointer border-r border-heritage-ink/8 active:bg-heritage-cream/60">
                          <Camera size={16} className="text-heritage-gold" />
                          <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink/50">Scatta</span>
                          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImage} />
                        </label>
                        <label className="flex flex-col items-center gap-1 py-2.5 cursor-pointer active:bg-heritage-cream/60">
                          <ImageIcon size={16} className="text-heritage-gold" />
                          <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink/50">{(imageBase64 || form.imageUrl) ? 'Cambia' : 'Galleria'}</span>
                          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleImage} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Testo grezzo + AI */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Racconta in parole tue</label>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Scrivi qualcosa di grezzo: cosa ricordi, chi c'era, dove, quando..."
                    className="w-full bg-white border border-heritage-ink/12 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold resize-none"
                    style={{ fontSize: '16px', minHeight: '80px' }}
                  />
                  <button
                    onClick={handleAI}
                    disabled={!rawText.trim() || isAiLoading}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-950 text-heritage-gold rounded-full text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all hover:bg-emerald-900"
                  >
                    {isAiLoading ? <div className="w-3 h-3 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /> : <Sparkles size={13} />}
                    {isAiLoading ? 'Scrivo...' : '✦ Aiutami a scriverlo'}
                  </button>
                </div>

                {/* Testo finale */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Ricordo</label>
                  <textarea
                    value={form.text}
                    onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Il testo del ricordo..."
                    className="w-full bg-white border border-heritage-ink/12 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold resize-none"
                    style={{ fontSize: '16px', minHeight: '100px' }}
                  />
                </div>

                {/* Autore + data */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Autore</label>
                    <input value={form.author} readOnly={!canEditAll} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Chi racconta" className="w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-heritage-gold" style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Data</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-heritage-gold" style={{ fontSize: '16px' }} />
                  </div>
                </div>

                {/* Oggetto collegato */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Collega a un oggetto (opzionale)</label>
                  <select value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} className="w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-heritage-gold" style={{ fontSize: '16px' }}>
                    <option value="">— Nessun oggetto —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>

                {/* Visibilità */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Visibilità</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['public', 'private'] as const).map(v => (
                      <button key={v} type="button"
                        onClick={() => setForm(f => ({ ...f, visibility: v }))}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-[12px] font-bold uppercase tracking-wide transition-all ${form.visibility === v ? (v === 'public' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-heritage-ink bg-heritage-ink/5 text-heritage-ink') : 'border-heritage-ink/10 text-heritage-ink/40 hover:border-heritage-ink/25'}`}>
                        {v === 'public' ? '🌐 Tutti' : '🔒 Solo famiglia'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-heritage-ink/35 italic mt-1.5">
                    {form.visibility === 'public' ? 'Visibile a tutti i visitatori' : 'Visibile solo agli utenti loggati'}
                  </p>
                </div>

                {/* Salva */}
                <button
                  onClick={handleSave}
                  disabled={!form.text.trim() || !form.author.trim() || isUploading}
                  className="w-full py-3 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-wider disabled:opacity-40 transition-all hover:bg-emerald-950"
                >
                  {isUploading ? 'Salvataggio...' : editId ? 'Salva modifiche' : 'Aggiungi ricordo'}
                </button>
              </div>
            )}
          </div>
          {/* Bottone chiudi fisso in fondo — mobile only */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 px-6 pb-8 pt-3 bg-heritage-cream border-t border-heritage-ink/8 flex-shrink-0 z-10">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-heritage-ink text-white rounded-full font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <X size={15} /> Chiudi
            </button>
          </div>

          {/* Bottone chiudi fisso in fondo — mobile only */}
          <div className="md:hidden px-6 pb-8 pt-3 bg-heritage-cream border-t border-heritage-ink/8 flex-shrink-0">
            <button onClick={onClose}
              className="w-full py-3.5 bg-heritage-ink text-white rounded-full font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2">
              <X size={15} /> Chiudi
            </button>
          </div>
      </div>
    </AnimatePresence>
  );
}
