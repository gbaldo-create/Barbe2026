

// ─── types ────────────────────────────────────────────────────────────────────

export interface FamilyMemory {
  id: string;
  text: string;
  author: string;
  date: string;
  itemId?: string;
  imageUrl?: string;
  visibility?: 'public' | 'private'; // omitted = public
  pinned?: boolean; // cover fissa — al massimo uno per volta
}

// Shuffle deterministico con seed — stesso ordine ad ogni reload
// Il seed deriva dagli ID dei ricordi: cambia solo quando aggiungi/rimuovi ricordi
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function memorySeed(memories: FamilyMemory[]): number {
  // Hash semplice degli ID — stabile finché la lista non cambia
  return memories.reduce((acc, m) => {
    for (let k = 0; k < m.id.length; k++) acc = (acc * 31 + m.id.charCodeAt(k)) & 0xffffffff;
    return acc;
  }, 0x12345678);
}

// Ordina: pinned primo, resto in ordine seeded stabile
export function orderMemories(memories: FamilyMemory[]): FamilyMemory[] {
  const pinned = memories.filter(m => m.pinned);
  const rest = memories.filter(m => !m.pinned);
  const seed = memorySeed(rest);
  return [...pinned, ...seededShuffle(rest, seed)];
}

export const resizeImage = (source: string | File): Promise<string> =>
  new Promise((resolve, reject) => {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;
    const img = new Image();
    img.onload = () => {
      if (isFile) URL.revokeObjectURL(url);
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
      else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')?.drawImage(img, 0, 0, w, h);
      // Target ~200KB file = ~267KB base64, iterate down if needed
        const TARGET_B64 = 267000;
        let quality = 0.78;
        let result = c.toDataURL('image/jpeg', quality);
        while (result.length > TARGET_B64 && quality > 0.3) {
          quality -= 0.08;
          result = c.toDataURL('image/jpeg', quality);
        }
        resolve(result);
    };
    img.onerror = () => { if (isFile) URL.revokeObjectURL(url); typeof source === 'string' ? resolve(source) : reject(new Error('Errore immagine')); };
    img.src = url;
  });

export function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

export const emptyForm = {
  name: '', description: '', room: '', category: '', year: '', dimensions: '',
  status: 'Disponibile' as any, acquisitionType: 'Vendita' as any,
  price: '', catawikiUrl: '', imageUrl: '', technicalNotes: '',
  destination: 'Barberino' as any, estimatedValue: '', productCode: '', displayPrice: '',
  wearCondition: '' as any, shipping: '' as any,
  isFeatured: false, isImportant: false, order: 0, details: [] as { label: string; value: string }[], images: [] as string[],
  // Campi Catawiki
  catawikiTitle: '', catawikiCategory: '', catawikiSubcategory: '',
  catawikiStyle: '', catawikiMaterial: '', catawikiCountry: '',
  catawikiRestored: false, catawikiWeight: '',
  catawikiShippingAvailable: false, catawikiPickupAvailable: true,
  catawikiDescription: '', catawikiImages: [] as string[],
  catawikiSpecific: {} as Record<string, string | boolean>,
};

// ─── Prepara scheda Catawiki con AI ──────────────────────────────────────────

export const CATAWIKI_STYLES = ['Art Déco', 'Art Nouveau', 'Barocco', 'Biedermeier', 'Classico', 'Eclettico', 'Impero', 'Liberty', 'Luigi XV', 'Luigi XVI', 'Modernista', 'Neoclassico', 'Rinascimentale', 'Rococò', 'Rustico', 'Vintage', 'Vittoriano', 'Altro'];
export const CATAWIKI_COUNTRIES = ['Italia', 'Francia', 'Inghilterra', 'Germania', 'Spagna', 'Austria', 'Olanda', 'Belgio', 'Svizzera', 'Cina', 'Giappone', 'Altro'];
export const CATAWIKI_CATEGORIES = ['Mobili antichi', 'Illuminazione antica', 'Sedute antiche', 'Quadri e stampe', 'Porcellane e ceramiche', 'Tappeti e tessuti', 'Orologi antichi', 'Argenteria', 'Oggetti decorativi', 'Libri antichi', 'Gioielli antichi', 'Sculture'];

export function getPublicBadge(status: string, acquisitionType?: string) {
  if (status === 'Disponibile' && acquisitionType === 'Lascito Affettivo') return { label: 'In adozione', cls: 'bg-emerald-700 text-white' };
  if (status === 'Disponibile') return { label: 'Disponibile', cls: 'bg-emerald-700 text-white' };
  if (status === 'Affidato') return { label: 'Affidato', cls: 'bg-heritage-ink/40 text-white' };
  if (status === 'Riservato') return { label: 'Riservato', cls: 'bg-heritage-ink/40 text-white' };
  if (status === 'Venduto') return { label: 'Venduto', cls: 'bg-heritage-ink/40 text-white' };
  return { label: 'Disponibile', cls: 'bg-emerald-700 text-white' };
}
export function isAdozione(item: any): boolean {
  return item?.acquisitionType === 'Lascito Affettivo' || item?.acquisitionType === 'Famiglia' || item?.status === 'Affidato';
}
export function getAdozioneLabel(item: any): string | null {
  if (item?.status === 'Affidato') return 'Affidato';
  if (item?.acquisitionType === 'Lascito Affettivo') return 'In adozione';
  return null;
}
