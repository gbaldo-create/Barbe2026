import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Upload, Image as ImageIcon,
} from 'lucide-react';
import { resizeImage } from '../lib/shared';

export function HeroImageModal({ isOpen, onClose, onSave, initialUrl }: { isOpen: boolean; onClose: () => void; onSave: (url: string) => void; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  useEffect(() => { setUrl(initialUrl); }, [initialUrl, isOpen]);
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f?.type.startsWith('image/')) { try { setUrl(await resizeImage(f)); } catch {} } };
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between"><h3 className="text-xl font-serif">Personalizza Sfondo Hero</h3><button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button></div>
          <div className="p-8 space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden border border-heritage-ink/5 bg-heritage-cream/10">{url ? <img src={url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-heritage-ink/20"><ImageIcon size={48} /></div>}</div>
            <label className="flex items-center justify-center gap-2 w-full py-4 bg-heritage-cream/20 border-2 border-dashed border-heritage-ink/10 rounded-2xl cursor-pointer hover:bg-heritage-cream/30"><Upload size={18} className="text-heritage-gold" /><span className="text-sm font-medium">Seleziona dal dispositivo</span><input type="file" className="hidden" accept="image/*" onChange={handleFile} /></label>
            <input value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-3 focus:outline-none focus:border-heritage-gold text-sm" placeholder="https://images.unsplash.com/..." />
            <button onClick={() => onSave(url)} disabled={!url} className="w-full heritage-button py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"><Sparkles size={18} />Aggiorna Sfondo</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
