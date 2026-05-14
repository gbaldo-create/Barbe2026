import { useState, useMemo, ReactNode, FormEvent, useEffect, DragEvent, ChangeEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Archive, Menu, X, Plus, SlidersHorizontal, MapPin, History,
  ChevronLeft, ChevronRight, Share2, Twitter, Facebook, Mail,
  ArrowLeft, ArrowRight, ExternalLink, Sparkles, Heart, Handshake,
  User, Upload, LogOut, Edit, Trash2, Image as ImageIcon, Check,
} from 'lucide-react';
import { HeritageItem, Memory, ViewType } from './types.ts';
import ITEMS_DATA from '../data/items.json';
import SETTINGS_DATA from '../data/settings.json';

// ─── types ────────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: HeritageItem[] = ITEMS_DATA as HeritageItem[];

const LOADER_QUOTES = [
  { text: 'Mamma e Franco che ballano in salotto a Natale.', author: 'Olivia' },
  { text: 'Le lunghe passeggiate di Franco nel giardino di Corso Corsini.', author: 'Emanuela' },
  { text: 'Aleria e la sua prima bambina Emma.', author: 'Aleria' },
  { text: 'Il cane Leap che correva felice in giardino.', author: 'Olivia' },
  { text: 'I figli di Olivia che giocano in piazza.', author: 'Emanuela' },
  { text: 'Il sapore inconfondibile dei crostini della Gina.', author: 'Aleria' },
  { text: "Le zanzare assassine delle sere d'estate.", author: 'Aleria' },
  { text: "Il calore del caminetto nelle sere d'inverno.", author: 'Olivia' },
  { text: 'Il grande tavolo di legno in cucina, cuore della casa.', author: 'Emanuela' },
  { text: 'Il profumo del pecorino del babbo.', author: 'Olivia' },
];


// ─── family memories (voci di casa) ──────────────────────────────────────────

const FAMILY_MEMORIES = [
  {
    text: 'La scrivania di papà era il suo mondo. Ci passava le sere dopo cena, tra carte e sigarette. Sul piano i segni di una vita di lavoro — cerchi di tazzine, bruciature.',
    author: 'Emanuela',
    initials: 'EM',
    context: 'Le sere dopo cena',
    itemId: null as string | null,
    imageUrl: '' as string, // ← incolla qui l'URL della foto
  },
  {
    text: "Il cassone all'ingresso era il primo mobile che vedevi entrando in casa. Papà ci teneva le coperte buone. Noi ci nascondevamo dentro da piccole, e lui faceva finta di non trovarci.",
    author: 'Aleria',
    initials: 'AL',
    context: "L'ingresso di casa",
    itemId: null as string | null,
    imageUrl: '' as string, // ← incolla qui l'URL della foto
  },
  {
    text: 'Il lampadario del salone lo accendeva solo nelle grandi occasioni. Quando si illuminava, i cristalli proiettavano riflessi dappertutto — sembrava di stare in un palazzo.',
    author: 'Olivia',
    initials: 'OL',
    context: 'Ogni Natale',
    itemId: null as string | null,
    imageUrl: '' as string, // ← incolla qui l'URL della foto
  },
];

// ─── users database ───────────────────────────────────────────────────────────

const USERS: Record<string, string> = {
  olivia: 'olivia2026',
  aleria: 'aleria2026',
  emanuela: 'emanuela2026',
  gianmaria: 'gianmaria2026',
};

// ─── utils ────────────────────────────────────────────────────────────────────

const WhatsAppIcon = ({ size = 24, className = '', color = '#25D366' }: { size?: number; className?: string; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const resizeImage = (source: string | File): Promise<string> =>
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
      resolve(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { if (isFile) URL.revokeObjectURL(url); typeof source === 'string' ? resolve(source) : reject(new Error('Errore immagine')); };
    img.src = url;
  });

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

// ─── Claude vision analysis ───────────────────────────────────────────────────

async function analyzeImageWithClaude(imageBase64: string): Promise<Partial<typeof emptyForm> | null> {
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) { alert('Aggiungi VITE_ANTHROPIC_API_KEY nel file .env.local'); return null; }

  const base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const mediaType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `Sei un esperto di antiquariato italiano. Analizza questa foto di un oggetto di arredamento o antiquariato e restituisci SOLO un oggetto JSON valido con questi campi (nessun testo prima o dopo):
{
  "name": "nome breve e descrittivo in italiano",
  "description": "descrizione evocativa di 2-3 frasi in italiano, stile archivio familiare",
  "category": "una tra: Mobili, Illuminazione, Sedute, Quadri, Porcellane, Tappeti, Giardino, Oggetti",
  "room": "stanza più probabile in una villa storica italiana",
  "year": "epoca o anno stimato (es: Metà XVIII Secolo, 1950 circa)",
  "dimensions": "dimensioni stimate se visibili (es: 80x40x90 cm), altrimenti stringa vuota",
  "price": "prezzo di mercato stimato tra privati in euro (es: € 450), altrimenti stringa vuota"
}` }
        ]
      }]
    })
  });

  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Errore API'); }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { return null; }
}

const emptyForm = {
  name: '', description: '', room: '', category: '', year: '', dimensions: '',
  status: 'Disponibile' as any, acquisitionType: 'Vendita' as any,
  price: '', catawikiUrl: '', imageUrl: '', technicalNotes: '',
  destination: 'Barberino' as any, estimatedValue: '', productCode: '',
  isFeatured: false, order: 0, details: [] as { label: string; value: string }[], images: [] as string[]
};

// ─── helpers per esportare JSON ───────────────────────────────────────────────

function downloadJson(items: HeritageItem[]) {
  const clean = items.map(({ isFavorite, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'items.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── GitHub API ──────────────────────────────────────────────────────────────

const GITHUB_OWNER = 'gbaldo-create';
const GITHUB_REPO = 'Barbe2026';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'data/items.json';

async function getGitHubToken(): Promise<string | null> {
  return localStorage.getItem('b2026_github_token');
}

async function saveItemsToGitHub(items: HeritageItem[]): Promise<boolean> {
  const token = await getGitHubToken();
  if (!token) return false;

  const clean = items.map(({ isFavorite, ...rest }) => rest);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(clean, null, 2))));

  // Get current SHA
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });

  if (!res.ok) return false;
  const data = await res.json();
  const sha = data.sha;

  // Update file
  const updateRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'update catalog', content, sha, branch: GITHUB_BRANCH })
  });

  return updateRes.ok;
}

async function validateGitHubToken(token: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.ok;
}

async function saveSettingsToGitHub(settings: { heroImageUrl: string }): Promise<boolean> {
  const token = localStorage.getItem('b2026_github_token');
  if (!token) return false;

  const path = 'data/settings.json';
  const contentStr = JSON.stringify(settings, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(contentStr)));

  let sha: string | undefined;
  try {
    const check = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
  } catch {}

  const body: any = { message: 'update settings', content: base64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

async function uploadImageToGitHub(base64Data: string, fileName: string): Promise<string | null> {
  const token = localStorage.getItem('b2026_github_token');
  if (!token) return null;

  // Extract pure base64 without data:image/...;base64, prefix
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const path = `public/images/${fileName}`;

  // Check if file exists to get SHA
  let sha: string | undefined;
  try {
    const check = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
  } catch {}

  const body: any = { message: `upload image ${fileName}`, content: base64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) return null;
  // Return public URL
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [items, setItems] = useState<HeritageItem[]>(() => {
    try { const c = localStorage.getItem('b2026_items'); return c ? JSON.parse(c) : INITIAL_ITEMS; }
    catch { return INITIAL_ITEMS; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [loaderQuote, setLoaderQuote] = useState<{ text: string; author: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<HeritageItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [selectedStatus, setSelectedStatus] = useState('Tutti');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeritageItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(() => localStorage.getItem('b2026_hero') || (SETTINGS_DATA as any).heroImageUrl || 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=2000');
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('b2026_favs') || '[]'); } catch { return []; } });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');

  // Multi-user auth
  const [currentUser, setCurrentUser] = useState<string | null>(() => sessionStorage.getItem('b2026_user'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isAdmin = !!currentUser;

  useEffect(() => {
    setLoaderQuote(LOADER_QUOTES[Math.floor(Math.random() * LOADER_QUOTES.length)]);
    setTimeout(() => setIsLoading(false), 1100);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [view, selectedItem?.id]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('item');
    if (id) { const it = items.find(i => i.id === id); if (it) { setSelectedItem(it); setView('item-detail'); window.history.pushState({}, '', window.location.pathname); } }
  }, [items]);

  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── GitHub token state ──
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem('b2026_github_token'));
  const [isGithubTokenModalOpen, setIsGithubTokenModalOpen] = useState(false);

  // ── persist ──
  const persist = async (updated: HeritageItem[]) => {
    const clean = updated.map(({ isFavorite, ...rest }) => rest);
    localStorage.setItem('b2026_items', JSON.stringify(clean));
    setItems(updated);
    // Save to GitHub if token available
    const token = localStorage.getItem('b2026_github_token');
    if (token) {
      const ok = await saveItemsToGitHub(updated);
      if (ok) showNotif('Salvato su GitHub ✓');
      else showNotif('Salvato in locale (GitHub non raggiungibile)', 'error');
    }
  };

  // ── merged ──
  const mergedItems = useMemo(() => items.map(item => {
    const imageUrl = item.imageUrl || item.images?.[0] || 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80';
    let category = (item.category || '').trim() || 'Altro';
    const nl = item.name?.toLowerCase() || '';
    const cl = category.toLowerCase();
    if (cl.includes('illumin') || nl.includes('lampadario') || nl.includes('lampada')) category = 'Illuminazione';
    else if (cl.includes('poltron') || cl.includes('sedute') || nl.includes('poltrona') || nl.includes('divano')) category = 'Sedute';
    return { ...item, category, imageUrl, isFavorite: favorites.includes(item.id) };
  }).sort((a: any, b: any) => {
    const ha = a.order != null, hb = b.order != null;
    if (ha && hb) return Number(a.order) - Number(b.order);
    if (ha) return -1; if (hb) return 1; return 0;
  }), [items, favorites]);

  const currentItem = useMemo(() => selectedItem ? mergedItems.find(i => i.id === selectedItem.id) || null : null, [selectedItem, mergedItems]);
  const relatedItems = useMemo(() => currentItem ? mergedItems.filter(i => i.id !== currentItem.id && (i.category === currentItem.category || i.room === currentItem.room)).slice(0, 3) : [], [currentItem, mergedItems]);

  const categoriesWithCount = useMemo(() => {
    const c: Record<string, number> = {};
    mergedItems.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return [{ name: 'Tutti', count: mergedItems.length }, ...Object.keys(c).sort().map(n => ({ name: n, count: c[n] }))];
  }, [mergedItems]);

  const statusFilters = ['Tutti', 'In vendita', 'Su Catawiki', 'In adozione'];

  const filteredItems = useMemo(() => mergedItems.filter(item => {
    const mc = selectedCategory === 'Tutti' || item.category === selectedCategory;
    const mf = !showFavoritesOnly || item.isFavorite;
    let ms = true;
    if (selectedStatus !== 'Tutti') {
      if (selectedStatus === 'In vendita') ms = item.status === 'Disponibile' && !item.catawikiUrl?.trim();
      else if (selectedStatus === 'Su Catawiki') ms = !!item.catawikiUrl?.trim();
      else if (selectedStatus === 'In adozione') ms = item.status === 'Affidato';
    }
    return mc && mf && ms;
  }), [mergedItems, selectedCategory, selectedStatus, showFavoritesOnly]);

  const handleBackToCatalog = (target: ViewType = 'catalog') => {
    setSelectedCategory('Tutti'); setSelectedStatus('Tutti');
    setShowFavoritesOnly(false); setView(target);
    setSelectedItem(null); setIsMobileMenuOpen(false);
  };

  const toggleFavorite = (itemId: string, e?: MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      localStorage.setItem('b2026_favs', JSON.stringify(next));
      return next;
    });
  };

  const handleAddStory = async () => {
    if (!currentItem || !newStoryText.trim()) return;
    const story: Memory = { id: genId(), author: 'Famiglia', text: newStoryText.trim(), date: new Date().toISOString().split('T')[0], itemId: currentItem.id };
    await persist(items.map(i => i.id === currentItem.id ? { ...i, stories: [...(i.stories || []), story] } : i));
    setNewStoryText('');
    showNotif('Racconto aggiunto ✓');
  };

  const handleSaveItem = async (itemData: HeritageItem) => {
    let updated: HeritageItem[];
    if (editingItem) {
      updated = items.map(i => i.id === editingItem.id ? itemData : i);
    } else {
      itemData.id = genId();
      itemData.order = items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 1;
      updated = [...items, itemData];
    }
    await persist(updated);
    setIsItemModalOpen(false); setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    await persist(items.filter(i => i.id !== itemId));
    setItemToDelete(null); handleBackToCatalog();
    showNotif('Oggetto eliminato');
  };

  const handleLogin = (username: string, pwd: string, token?: string) => {
    if (USERS[username] && USERS[username] === pwd) {
      sessionStorage.setItem('b2026_user', username);
      setCurrentUser(username);
      if (token) {
        localStorage.setItem('b2026_github_token', token);
        setGithubToken(token);
      }
      setIsLoginModalOpen(false);
      showNotif(`Benvenuto, ${username}! ✓`);
    } else {
      showNotif('Username o password errati', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('b2026_user');
    localStorage.removeItem('b2026_github_token');
    setCurrentUser(null);
    setGithubToken(null);
    showNotif('Logout effettuato');
  };

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-heritage-cream">

      {/* Loader */}
      <AnimatePresence>
        {(isLoading || !dismissed) && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-heritage-cream">
            <div className="flex flex-col items-center px-6">
              <div className="w-16 h-16 border-4 border-heritage-gold border-t-transparent rounded-full animate-spin mb-8" />
              {loaderQuote && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                  <h2 className="text-3xl font-serif mb-6 italic text-center">Raccogliendo i Ricordi...</h2>
                  <p className="text-heritage-ink/80 text-xl font-heritage italic leading-relaxed text-center">"{loaderQuote.text}"</p>
                  <p className="text-heritage-gold font-bold uppercase tracking-[0.2em] text-[10px] mt-3">— {loaderQuote.author}</p>
                </motion.div>
              )}
              <div className="mt-12 h-14 flex items-center justify-center">
                {!isLoading && (
                  <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDismissed(true)} className="px-10 py-4 bg-heritage-ink text-heritage-cream rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-heritage-olive transition-colors flex items-center gap-3">
                    Prosegui <ArrowRight size={16} />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="fixed top-5 md:top-10 left-0 right-0 z-50 px-4 md:px-8 flex justify-center pointer-events-none">
        <header className="w-full max-w-7xl pointer-events-auto bg-emerald-950/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] md:rounded-[3rem] text-white">
          <div className="px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => handleBackToCatalog('home')}>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-heritage-gold rounded-full flex items-center justify-center text-emerald-950 group-hover:bg-white transition-colors">
                <History size={18} />
              </div>
              <div>
                <h1 className="text-sm md:text-lg font-bold font-serif text-white leading-none">Barberino2026</h1>
                <p className="text-[7px] md:text-[9px] uppercase tracking-[0.2em] text-heritage-gold/80 font-medium mt-1">Archivio di Famiglia</p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <NavItem active={view === 'catalog'} onClick={() => handleBackToCatalog('catalog')} icon={<Archive size={18} />} label="Gli Oggetti di Casa" />
              <NavItem active={false} onClick={() => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 100); }} icon={<Handshake size={18} />} label="Vendita / Adozione" />
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
              {currentUser ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="hidden sm:flex gap-2">
                    <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }} className="flex items-center gap-2 bg-heritage-gold text-white px-4 py-2 rounded-full text-xs font-bold hover:scale-105 transition-all shadow-md">
                      <Plus size={16} /><span className="hidden lg:inline">Nuovo</span>
                    </button>
                    <button onClick={() => downloadJson(items)} title="Scarica items.json aggiornato" className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 hover:bg-white/20 transition-all shadow-md">
                      <span className="hidden lg:inline">↓ items.json</span><span className="lg:hidden">↓</span>
                    </button>
                  </div>
                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <p className="text-[8px] uppercase font-bold text-heritage-gold">{currentUser}</p>
                    <p className="text-[7px] uppercase font-bold text-white/40">Editor</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"><LogOut size={18} /></button>
                </div>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all text-white shadow-sm">
                  <User size={14} /><span className="hidden xs:inline">Famiglia</span>
                </button>
              )}
              <button className="lg:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-emerald-900 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
                <div className="flex flex-col p-6 gap-4">
                  <button onClick={() => handleBackToCatalog('catalog')} className={`flex items-center gap-3 p-3 rounded-xl ${view === 'catalog' ? 'bg-white/10 text-white' : 'text-white/60'}`}><Archive size={20} /><span className="font-heritage text-lg">Gli Oggetti di Casa</span></button>
                  <button onClick={() => { setView('home'); setIsMobileMenuOpen(false); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Handshake size={20} /><span className="font-heritage text-lg">Vendita / Adozione</span></button>
                  {isAdmin && (
                    <div className="flex flex-col gap-2 mt-2">
                      <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 heritage-button-gold w-full"><Plus size={18} /><span className="font-heritage">Nuovo Oggetto</span></button>
                      <button onClick={() => { downloadJson(items); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 bg-white/10 text-white p-3 rounded-xl border border-white/10"><span className="font-heritage">↓ Scarica items.json</span></button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>

      {/* Views */}
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence>

          {/* ── HOME ── */}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              <section className="relative min-h-screen flex items-end overflow-hidden mb-24">
                <div className="absolute inset-0 z-0">
                  <img src={heroImageUrl} className="w-full h-full object-cover object-right" alt="Barberino2026" />
                  <div className="absolute inset-0 bg-heritage-ink/10" />
                  {isAdmin && (
                    <div className="absolute top-24 right-6 md:bottom-10 md:top-auto md:right-10 z-30">
                      <button onClick={() => setIsHeroModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/30 hover:bg-white/30 transition-all shadow-2xl">
                        <ImageIcon size={16} /><span>Cambia Sfondo</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pb-44 md:pb-20">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-md md:max-w-xl lg:max-w-[50%] bg-heritage-cream/60 backdrop-blur-xl p-6 md:py-5 md:px-10 lg:py-6 lg:px-12 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border-l-[4px] md:border-l-[8px] border-heritage-gold space-y-2 md:space-y-3">
                    <div>
                      <span className="text-emerald-800/80 text-[10px] uppercase tracking-[0.3em] font-bold mb-0.5 block">1 Corso Corsini</span>
                      <h2 className="text-2xl md:text-3xl lg:text-4xl leading-[1.1] font-serif text-heritage-ink italic">Barberino2026, <br />una casa che si <span className="text-emerald-950 not-italic font-display font-bold tracking-tight">trasforma.</span></h2>
                    </div>
                    <p className="text-sm md:text-base text-heritage-ink/70 leading-snug font-heritage italic">"Oggetti che si vendono, vissuti che si affidano. Ogni pezzo è custode di una storia antica."</p>
                    <div className="pt-1">
                      <button onClick={() => handleBackToCatalog()} className="px-6 py-3 bg-heritage-ink text-white rounded-lg font-bold uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-heritage-gold transition-all shadow-xl group flex items-center gap-3">
                        Esplora la Collezione <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-4 md:px-6">

                {/* ── SEZIONE 1: IN VENDITA / CATAWIKI / ADOZIONE ── */}
                <section className="border-y border-heritage-gold/15 -mx-4 md:-mx-6 px-4 md:px-6 py-16 md:py-24 mb-0 bg-heritage-cream/40">
                  <div className="max-w-4xl mx-auto">
                    <span className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Il nostro approccio</span>
                    <h2 className="text-3xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Non stiamo vendendo oggetti.</span><br /><span className="font-serif italic text-heritage-gold">Stiamo affidando</span> <span className="font-display font-medium tracking-tight text-heritage-gold not-italic">ricordi.</span></h2>
                    <div className="w-11 h-px bg-heritage-gold opacity-40 my-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                      {/* Vendita diretta */}
                      <div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">€</div>
                        <p className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold mb-4">Vendita diretta</p>
                        <p className="text-[13.5px] leading-relaxed text-heritage-ink/75 italic font-heritage">Alcuni oggetti hanno attraversato un secolo. Il loro prezzo riconosce la storia, la mano che li ha creati, il tempo che li ha resi unici.</p>
                      </div>
                      {/* Catawiki */}
                      <div className="border border-heritage-gold/25 rounded-2xl p-7 bg-heritage-gold/8 relative overflow-hidden">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-gold/[0.06] leading-none pointer-events-none select-none">⟡</div>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold">Su Catawiki</p>
                          <span className="text-[8px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2 py-0.5 rounded-full">asta</span>
                        </div>
                        <p className="text-[13.5px] leading-relaxed text-heritage-ink/75 italic font-heritage mb-4">Alcuni pezzi di pregio vengono battuti all'asta su Catawiki, piattaforma europea per oggetti da collezione.</p>
                        <div className="bg-heritage-gold/5 border border-heritage-gold/20 rounded-xl p-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[8px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2.5 py-1 rounded-full">Su Catawiki</span>
                            <ExternalLink size={10} className="text-heritage-gold/50" />
                          </div>
                          <p className="text-[11px] leading-relaxed text-heritage-ink/60 italic font-heritage">Nel catalogo troverai questo badge con link diretto all'asta.</p>
                        </div>
                      </div>
                      {/* Adozione */}
                      <div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">♡</div>
                        <p className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold mb-4">In adozione</p>
                        <p className="text-[13.5px] leading-relaxed text-heritage-ink/75 italic font-heritage">Per questi non chiediamo nulla. Solo che finiscano nelle mani giuste — qualcuno che li faccia vivere ancora, come faceva papà.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 2: GALLERY IN EVIDENZA ── */}
                <div className="mt-20 md:mt-28 relative pb-8">
                  <div className="relative flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-16 gap-4">
                    <div className="space-y-3">
                      <span className="text-heritage-gold text-[9px] uppercase tracking-[0.35em] font-bold">In evidenza</span>
                      <h3 className="text-3xl md:text-5xl text-heritage-ink leading-tight"><span className="font-serif italic">Le cose </span><span className="font-display font-medium tracking-tight text-emerald-950 not-italic">più belle</span></h3>
                      <div className="w-12 h-px bg-heritage-gold/30" />
                    </div>
                    <button onClick={() => handleBackToCatalog()} className="group text-[9px] font-bold uppercase tracking-widest text-heritage-gold flex items-center gap-3 hover:opacity-70 transition-opacity self-start md:self-auto">
                      Vedi l'intera collezione <span className="p-2 border border-heritage-gold/20 rounded-full group-hover:bg-heritage-gold group-hover:text-white transition-all"><ChevronRight size={14} /></span>
                    </button>
                  </div>
                  <div className="relative grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[320px] lg:auto-rows-[300px]">
                    {[...mergedItems.filter(i => i.catawikiUrl?.trim()), ...mergedItems.filter(i => !i.catawikiUrl?.trim())].slice(0, 6).map((item, idx) => {
                      const cls = ['col-span-2 md:col-span-2 lg:col-span-2 lg:row-span-2', 'col-span-1 lg:col-span-1 lg:row-span-2', 'col-span-1 lg:col-span-2 lg:row-span-1', 'col-span-2 md:col-span-1 lg:col-span-1', 'col-span-1', 'col-span-1 md:col-span-2 lg:col-span-2'][idx] || '';
                      return (
                        <motion.div key={item.id} className={`${cls} flex`} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ delay: idx * 0.1, duration: 0.8 }}>
                          <ItemCard item={item} onClick={() => { setSelectedItem(item); setView('item-detail'); }} onToggleFavorite={isAdmin ? toggleFavorite : undefined} isAdmin={isAdmin} imageHeightRatio="100%" isFeaturedCard />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* ── SEZIONE 3: TRE PASSI ── */}
                <section id="how-it-works" className="mt-20 md:mt-28 pt-12 md:pt-16 border-t border-heritage-ink/8">
                  <span className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Come funziona</span>
                  <h2 className="text-3xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Semplice, umano.</span><br /><span className="font-serif italic text-heritage-gold">Da casa </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">a casa.</span></h2>
                  <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
                    {[
                      { n: '01', t: 'Sfoglia', b: 'Esplora il catalogo, trova quello che ti colpisce. Ogni oggetto ha un nome, una stanza, una storia. Alcuni sono su Catawiki.' },
                      { n: '02', t: 'Scrivici', b: 'Un messaggio WhatsApp basta — siamo persone, non un negozio. Ci accordiamo insieme su tutto.' },
                      { n: "03", t: "Porta a casa", b: "Ritiro a Cinisello Balsamo o spedizione concordata. L'oggetto riparte. Il ricordo resta." },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col gap-4">
                        <div className="font-serif text-[52px] text-heritage-gold opacity-20 leading-none">{s.n}</div>
                        <div className="w-7 h-px bg-heritage-gold opacity-30" />
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-ink">{s.t}</p>
                        <p className="text-[14px] leading-relaxed text-heritage-ink/70 italic font-heritage">{s.b}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center md:justify-start">
                    <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] text-white rounded-full text-[10px] font-bold tracking-[0.2em] uppercase">
                      <WhatsAppIcon size={15} color="#fff" /> Scrivici su WhatsApp
                    </a>
                  </div>
                </section>

                {/* ── SEZIONE 4: LA NOSTRA STORIA ── */}
                <section className="mt-20 md:mt-28 pt-12 md:pt-16 border-t border-heritage-ink/8">
                  <span className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">La nostra storia</span>
                  <h2 className="text-3xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">La casa della</span><br /><span className="font-serif italic text-heritage-gold">famiglia </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">Manescalchi</span></h2>
                  <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-start">
                    <div className="md:col-span-3 flex flex-col gap-8">
                      {[
                        { k: 'La casa', v: 'Ci sono case che sono più di quattro mura. Quella di Barberino di Mugello è cresciuta per oltre 160 anni, pezzo dopo pezzo, stagione dopo stagione. Ogni stanza aveva il suo carattere, ogni angolo il suo odore.' },
                        { k: 'Franco', v: 'Franco Manescalchi ci teneva a quella casa come a un essere vivente. Ogni mobile, ogni lampadario, ogni specchio era arrivato lì con una ragione — e ci era rimasto perché aveva trovato il suo posto.' },
                        { k: 'La scelta', v: 'Così hanno deciso: non vendere, ma affidare. Trovare persone che amino questi oggetti come li amava papà. Perché i ricordi non finiscono — continuano in chi li accoglie.' },
                      ].map((item, i) => (
                        <div key={i}>
                          <p className="text-[9px] tracking-[0.3em] uppercase font-bold text-heritage-gold mb-3">{item.k}</p>
                          <p className="text-[14px] leading-relaxed text-heritage-ink/75 italic font-heritage">{item.v}</p>
                          {i < 2 && <div className="w-px h-6 bg-heritage-gold/20 mt-8" />}
                        </div>
                      ))}
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-4">
                      <div className="bg-heritage-ink rounded-2xl px-8 py-10 text-center">
                        <div className="font-serif text-[68px] text-heritage-gold leading-none italic mb-2">160+</div>
                        <p className="text-[9px] tracking-[0.3em] uppercase font-bold text-white/50">anni di storia</p>
                      </div>
                      <div className="bg-white rounded-2xl p-7 border border-heritage-ink/8">
                        <p className="font-serif text-[16px] leading-relaxed text-heritage-ink italic opacity-90 mb-4">"I ricordi che portano con sé non finiscono con noi. Sono per sempre."</p>
                        <p className="text-[9px] tracking-[0.25em] uppercase font-bold text-heritage-gold">Aleria, Olivia ed Emanuela</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 5: LE VOCI DI CASA ── */}
                <section className="mt-20 md:mt-28 -mx-4 md:-mx-6 px-4 md:px-6 py-16 md:py-24 bg-heritage-cream/60">
                  <div className="max-w-4xl mx-auto">
                    <span className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">I ricordi di famiglia</span>
                    <h2 className="text-3xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Le voci </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">di casa</span></h2>
                    <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {FAMILY_MEMORIES.map((mem, i) => {
                        const linkedItem = mem.itemId ? mergedItems.find(it => it.id === mem.itemId) : null;
                        const photo = linkedItem?.imageUrl || mem.imageUrl || null;
                        return (
                          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                            {photo ? (
                              <div className="h-52 overflow-hidden">
                                <img src={photo} alt={mem.author} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-16 bg-heritage-cream/60 flex items-end px-6 pb-0">
                                <span className="font-serif text-[44px] text-heritage-gold opacity-15 leading-none">"</span>
                              </div>
                            )}
                            <div className="p-6 flex flex-col flex-1 justify-between gap-5">
                              <p className="text-[14px] leading-relaxed text-heritage-ink/75 italic font-heritage">{mem.text}</p>
                              <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-5">
                                <div className="w-8 h-8 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[10px] font-bold flex-shrink-0">{mem.initials}</div>
                                <div>
                                  <p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p>
                                  <p className="text-[9px] tracking-[0.15em] uppercase text-heritage-gold font-bold mt-0.5">{mem.context}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 6: CONTATTI ── */}
                <section className="mt-20 md:mt-28 pb-20 md:pb-28">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
                    <div>
                      <span className="text-[9px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Parliamoci</span>
                      <h2 className="text-3xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Hai domande?</span><br /><span className="font-serif italic text-heritage-gold">Siamo </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">qui.</span></h2>
                      <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-8" />
                      <p className="text-[14px] leading-relaxed text-heritage-ink/75 italic font-heritage mb-8">Non sei sicuro, vuoi vedere un oggetto dal vivo, o vuoi seguire un'asta su Catawiki? Ogni messaggio è il benvenuto. Rispondiamo entro poche ore.</p>
                      <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] text-white rounded-full text-[10px] font-bold tracking-[0.2em] uppercase">
                        <WhatsAppIcon size={14} color="#fff" /> Scrivici su WhatsApp
                      </a>
                    </div>
                    <div className="flex flex-col gap-3 md:pt-14">
                      {[
                        { icon: <MapPin size={16} className="text-heritage-gold" />, label: 'Dove siamo', title: 'Viale Veneto 1', sub: 'Cinisello Balsamo (MI)', dark: false },
                        { icon: <History size={16} className="text-heritage-gold" />, label: 'Disponibilità', title: 'Su appuntamento', sub: 'Risposta garantita entro poche ore', dark: false },
                        { icon: <ArrowRight size={16} className="text-heritage-gold" />, label: 'Spedizione', title: 'Concordata insieme', sub: 'Tutta Italia', dark: false },
                        { icon: <ExternalLink size={16} className="text-heritage-gold" />, label: 'Aste online', title: 'Catawiki', sub: 'Pezzi selezionati', dark: true },
                      ].map((row, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 py-5 rounded-2xl border ${row.dark ? 'bg-heritage-ink border-heritage-ink' : 'bg-white border-heritage-ink/8'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${row.dark ? 'bg-heritage-gold/15' : 'bg-heritage-cream'}`}>{row.icon}</div>
                          <div>
                            <p className="text-[9px] tracking-[0.3em] uppercase font-bold text-heritage-gold mb-1">{row.label}</p>
                            <p className={`text-[14px] font-bold ${row.dark ? 'text-white' : 'text-heritage-ink'}`}>{row.title}</p>
                            <p className={`text-[13px] mt-0.5 ${row.dark ? 'text-white/30' : 'text-heritage-ink/40'}`}>{row.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

              </div>
            </motion.div>
          )}

          {/* ── CATALOG ── */}
          {view === 'catalog' && (
            <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-[320px] pb-12">

              {/* Mobile title - in flow */}
              <div className="md:hidden mb-8">
                <h2 className="text-3xl font-serif italic text-heritage-ink leading-tight mb-2">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                <p className="text-heritage-ink/60 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
              </div>

              {/* Fixed sticky block: cream bg from top, covers scrolling cards — desktop only */}
              <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-heritage-cream pt-[156px] px-6 pb-4 shadow-[0_8px_32px_0_rgba(30,25,20,0.10)]">
                <div className="max-w-7xl mx-auto">
                  <div className="mb-4">
                    <h2 className="text-3xl md:text-5xl font-serif italic text-heritage-ink leading-tight mb-1">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                    <p className="text-heritage-ink/60 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
                  </div>
                </div>
              </div>

              <div className="md:fixed md:top-[256px] left-0 right-0 z-40 bg-heritage-cream border-b border-heritage-ink/10 px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="hidden md:flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/30 mr-2">Categorie</span>
                    {categoriesWithCount.map(cat => (
                      <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${selectedCategory === cat.name ? 'bg-heritage-olive text-white' : 'bg-white/50 text-heritage-ink/40 hover:bg-heritage-cream'}`}>
                        <span>{cat.name}</span><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-heritage-ink/5 text-heritage-ink/30'}`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="hidden md:flex flex-wrap gap-2 items-center ml-auto">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/30 mr-2">Stato</span>
                    {statusFilters.map(s => <button key={s} onClick={() => setSelectedStatus(s)} className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white/50 text-heritage-ink/40'}`}>{s}</button>)}
                    {isAdmin && <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`ml-2 p-2 rounded-full transition-all border ${showFavoritesOnly ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white/50 border-heritage-ink/5 text-heritage-ink/30'}`}><Heart size={16} fill={showFavoritesOnly ? 'currentColor' : 'none'} /></button>}
                  </div>
                  <div className="flex md:hidden w-full items-center justify-between px-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest font-bold text-heritage-gold mb-0.5">Filtri Attivi</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink italic truncate max-w-[200px]">{selectedCategory}{selectedStatus !== 'Tutti' ? ` • ${selectedStatus}` : ''}</span>
                    </div>
                    <button onClick={() => setIsMobileFilterOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-heritage-ink text-white rounded-full text-[10px] font-bold uppercase tracking-widest"><SlidersHorizontal size={14} /> Filtra</button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isMobileFilterOpen && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileFilterOpen(false)} className="fixed inset-0 bg-heritage-ink/40 backdrop-blur-sm z-[110]" />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-heritage-cream z-[120] rounded-t-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                      <div className="w-12 h-1.5 bg-heritage-ink/10 rounded-full mx-auto mb-8" />
                      <div className="space-y-8 pb-12">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-serif">Filtra</h3>
                          <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedCategory('Tutti'); setSelectedStatus('Tutti'); }} className="text-[10px] uppercase font-bold tracking-widest text-heritage-gold">Reset</button>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-heritage-ink/5 rounded-full text-heritage-ink/40"><X size={24} /></button>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-heritage-ink/40 mb-4">Categorie</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoriesWithCount.map(cat => <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`px-4 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all text-left flex justify-between items-center ${selectedCategory === cat.name ? 'bg-heritage-olive text-white' : 'bg-white text-heritage-ink/40 border border-heritage-ink/5'}`}><span>{cat.name}</span><span className={`text-[9px] px-2 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20' : 'bg-heritage-ink/5 text-heritage-ink/20'}`}>{cat.count}</span></button>)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-heritage-ink/40 mb-4">Stato</h4>
                          <div className="flex flex-wrap gap-2">
                            {statusFilters.map(s => <button key={s} onClick={() => setSelectedStatus(s)} className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white border border-heritage-ink/10 text-heritage-ink/40'}`}>{s}</button>)}
                          </div>
                        </div>
                        <button onClick={() => setIsMobileFilterOpen(false)} className="w-full heritage-button py-4 text-sm">Mostra Risultati</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="hidden md:block h-20" />
              <div className="flex flex-wrap gap-4 md:gap-8">
                {filteredItems.map(item => (
                  <div key={item.id} className="flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]">
                    <ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onClick={() => { setSelectedItem(item); setView('item-detail'); }} isAdmin={isAdmin} />
                  </div>
                ))}
                {filteredItems.length === 0 && <div className="w-full py-20 text-center border border-dashed border-heritage-ink/10 rounded-2xl"><p className="text-heritage-ink/40 italic font-serif">Nessun oggetto trovato.</p></div>}
              </div>
            </motion.div>
          )}

          {/* ── DETAIL ── */}
          {view === 'item-detail' && currentItem && (
            <motion.div key={currentItem.id} initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-48 pb-12">
              <button onClick={() => handleBackToCatalog()} className="flex items-center gap-2 text-heritage-ink/60 hover:text-heritage-ink mb-8 group transition-colors"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="font-heritage">Ritorna alla Collezione</span></button>
              <div className="grid lg:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <ImageGallery images={[currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[]} name={currentItem.name} status={currentItem.status} catawikiUrl={currentItem.catawikiUrl} />
                </div>
                <div className="flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-heritage-gold uppercase tracking-[0.3em] text-[10px] font-bold"><span className="w-8 h-[1px] bg-heritage-gold" />{currentItem.category}</div>
                      {isAdmin && <button onClick={e => toggleFavorite(currentItem.id, e)} className={`p-2.5 rounded-full transition-all border ${currentItem.isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-heritage-ink/5 border-heritage-ink/10 text-heritage-ink/40'}`}><Heart size={18} fill={currentItem.isFavorite ? 'currentColor' : 'none'} /></button>}
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif italic text-heritage-ink leading-tight mb-6">{currentItem.name.split(' ')[0]} <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">{currentItem.name.split(' ').slice(1).join(' ')}</span></h2>
                    {isAdmin && (
                      <div className="flex gap-4 mb-4">
                        <button onClick={() => { setEditingItem(currentItem); setIsItemModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-heritage-ink text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-heritage-olive transition-colors shadow-lg"><Edit size={14} />Modifica</button>
                        <button onClick={() => setItemToDelete(currentItem.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 border border-red-100"><Trash2 size={14} />Elimina</button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-4 py-8 border-t border-heritage-ink/10">
                      <DetailBox label="Stanza" value={currentItem.room} />
                      <DetailBox label="Epoca" value={currentItem.year || 'N/D'} />
                      <DetailBox label="Dimensioni" value={currentItem.dimensions || 'N/D'} />
                      <DetailBox label="Dove si trova" value={currentItem.destination || 'N/D'} />
                      <DetailBox label="Acquisizione" value={currentItem.acquisitionType} />
                      <DetailBox label="Prezzo / Valore" value={currentItem.price || currentItem.estimatedValue || 'Su richiesta'} />
                      {currentItem.productCode && <DetailBox label="Codice" value={currentItem.productCode} />}
                      {currentItem.catawikiUrl && (
                        <div className="flex flex-col gap-1"><span className="text-[9px] uppercase tracking-widest font-bold opacity-30">Catawiki</span>
                          <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B1818]/10 text-[#7B1818] rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#7B1818]/20 w-fit">Vedi <ExternalLink size={10} /></a>
                        </div>
                      )}
                    </div>
                    <div className="prose prose-stone mb-12">
                      <h4 className="font-serif text-xl mb-4 italic">Descrizione e Storia</h4>
                      <p className="text-lg leading-relaxed text-heritage-ink/70 font-light mb-8">{currentItem.description}</p>
                      {currentItem.technicalNotes && <div className="mt-8 p-6 bg-heritage-cream/20 rounded-2xl border border-heritage-ink/5"><h5 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 text-heritage-gold">Dettagli Tecnici</h5><p className="text-sm italic leading-relaxed text-heritage-ink/70">{currentItem.technicalNotes}</p></div>}
                    </div>
                    {/* Stories */}
                    <div className="bg-white p-8 rounded-2xl border border-heritage-ink/5 mb-12">
                      <div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-serif italic text-heritage-gold">Ricordi</h3><Sparkles size={18} className="text-heritage-gold opacity-50" /></div>
                      <div className="space-y-6">
                        {currentItem.stories.map(s => <div key={s.id} className="relative pl-6 border-l-2 border-heritage-gold/20"><p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-2">{s.author} • {s.date}</p><p className="text-base italic leading-relaxed text-heritage-ink/80">"{s.text}"</p></div>)}
                        {currentItem.stories.length === 0 && <p className="text-xs italic text-heritage-ink/30 text-center py-4">Nessun ricordo ancora.</p>}
                      </div>
                      {isAdmin && (
                        <div className="mt-8 pt-8 border-t border-heritage-ink/5">
                          <textarea className="w-full p-4 bg-heritage-cream/30 border border-heritage-ink/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-heritage-gold resize-none h-24 mb-4 text-sm" placeholder="Aggiungi un ricordo..." value={newStoryText} onChange={e => setNewStoryText(e.target.value)} />
                          <button onClick={handleAddStory} disabled={!newStoryText} className="w-full heritage-button py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">Preserva il Racconto Familiare</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a href={`https://wa.me/393394468130?text=Buongiorno,%20vorrei%20informazioni%20su:%20${encodeURIComponent(currentItem.name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 px-8 py-5 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all group shadow-xl"><WhatsAppIcon size={18} color="white" /><span className="font-heritage font-medium">Contatta su WhatsApp</span></a>
                      <button onClick={() => { const u = `${window.location.origin}?item=${currentItem.id}`; navigator.share ? navigator.share({ title: currentItem.name, url: u }).catch(() => {}) : (navigator.clipboard.writeText(u), showNotif('Link copiato!')); }} className="flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-heritage-ink/10 text-heritage-ink rounded-full hover:border-heritage-gold hover:text-heritage-gold transition-all group shadow-xl"><Share2 size={18} /><span className="font-heritage font-medium">Condividi</span></button>
                    </div>
                    <div className="flex items-center justify-center gap-6 py-4 border-t border-heritage-ink/5 mt-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Condividi su:</span>
                      <div className="flex gap-4">
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${currentItem.name} - ${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/40 hover:text-[#25D366] transition-all hover:scale-110"><WhatsAppIcon size={18} color="currentColor" /></a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/40 hover:text-heritage-gold transition-all hover:scale-110"><Facebook size={18} /></a>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}&text=${encodeURIComponent(currentItem.name)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/40 hover:text-heritage-gold transition-all hover:scale-110"><Twitter size={18} /></a>
                        <a href={`mailto:?subject=${encodeURIComponent(`Heritage: ${currentItem.name}`)}&body=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}`} className="p-2 text-heritage-ink/40 hover:text-heritage-gold transition-all hover:scale-110"><Mail size={18} /></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {relatedItems.length > 0 && (
                <div className="mt-24 pt-24 border-t border-heritage-ink/10">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 text-center mb-12">Ti potrebbe interessare anche...</h3>
                  <div className="hidden md:block h-20" />
              <div className="flex flex-wrap gap-4 md:gap-8">
                    {relatedItems.map(item => <div key={item.id} className="flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]"><ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onClick={() => { setSelectedItem(item); setView('item-detail'); }} isAdmin={isAdmin} /></div>)}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-heritage-ink/5 bg-heritage-cream/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h4 className="font-serif text-2xl mb-4 italic text-heritage-ink">Ti interessa un pezzo o vuoi saperne di più?</h4>
            <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all shadow-lg group"><WhatsAppIcon size={20} color="white" /><span className="font-heritage tracking-wide">Contattaci su WhatsApp</span></a>
          </div>
          <p className="text-sm font-serif opacity-40">Custodito per le generazioni future • 2026 • Barberino di Mugello</p>
        </div>
      </footer>

      {/* ── Modals ── */}

      {/* Login */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={() => setIsLoginModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between">
                <div><h3 className="text-xl font-serif">Accesso Famiglia</h3><p className="text-[10px] uppercase tracking-widest text-heritage-ink/40 font-bold mt-1">Operatori autorizzati</p></div>
                <button onClick={() => setIsLoginModalOpen(false)} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
              </div>
              <LoginForm onLogin={handleLogin} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Form */}
      <ItemModal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} onSave={handleSaveItem} initialData={editingItem} onDelete={id => setItemToDelete(id)} nextOrder={items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 1} />

      {/* Hero modal */}
      <HeroImageModal isOpen={isHeroModalOpen} onClose={() => setIsHeroModalOpen(false)} initialUrl={heroImageUrl} onSave={async url => {
              setHeroImageUrl(url);
              localStorage.setItem('b2026_hero', url);
              setIsHeroModalOpen(false);
              const ok = await saveSettingsToGitHub({ heroImageUrl: url });
              showNotif(ok ? 'Sfondo aggiornato su tutti i dispositivi ✓' : 'Sfondo aggiornato solo in locale');
            }} />

      {/* Delete confirm */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-heritage-ink/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setItemToDelete(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
              <h3 className="text-2xl font-serif mb-2">Sei sicuro?</h3>
              <p className="text-heritage-ink/60 mb-8 text-sm leading-relaxed">Questa operazione eliminerà definitivamente l'oggetto. Potrai recuperarlo solo dal file items.json.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setItemToDelete(null)} className="px-6 py-3 rounded-xl border border-heritage-ink/10 text-xs font-bold uppercase tracking-widest hover:bg-heritage-cream">Annulla</button>
                <button onClick={() => handleDeleteItem(itemToDelete)} className="px-6 py-3 rounded-xl bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg">Elimina</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-heritage-ink text-white border-heritage-ink'}`}>
            {notification.type === 'error' ? <X size={18} /> : <Check size={18} />}
            <span className="text-sm font-bold uppercase tracking-widest">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex items-center gap-2 transition-all pb-1 border-b-2 font-heritage text-lg ${active ? 'border-heritage-gold text-heritage-gold font-bold' : 'border-transparent text-white/50 hover:text-white'}`}>{icon}<span>{label}</span></button>;
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col"><span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40 mb-1">{label}</span><span className="font-serif text-lg">{value}</span></div>;
}

interface ItemCardProps { item: HeritageItem; onClick: () => void; onToggleFavorite?: (id: string, e: MouseEvent) => void; isAdmin?: boolean; aspectClassName?: string; imageHeightRatio?: string; isFeaturedCard?: boolean; }

function ItemCard({ item, onClick, onToggleFavorite, isAdmin, aspectClassName = 'aspect-[3/4]', imageHeightRatio, isFeaturedCard }: ItemCardProps) {
  return (
    <div onClick={onClick} className={`group cursor-pointer hover:translate-y-[-4px] transition-all duration-500 overflow-hidden flex flex-col h-full w-full ${isFeaturedCard ? 'heritage-card border-none shadow-xl' : 'heritage-card'}`}>
      <div className={`overflow-hidden relative shrink-0 w-full ${imageHeightRatio ? '' : (aspectClassName === 'aspect-[3/4]' ? 'aspect-square sm:aspect-[3/4]' : aspectClassName)}`} style={imageHeightRatio ? { height: imageHeightRatio } : {}}>
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
        {isFeaturedCard && <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/80 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4 lg:p-8"><h4 className="text-white text-lg lg:text-2xl font-serif mb-1 translate-y-0 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">{item.name}</h4><p className="text-heritage-gold text-[8px] lg:text-[10px] uppercase tracking-[0.2em] font-bold translate-y-0 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500 delay-75">{item.estimatedValue || item.price || 'Su Richiesta'}</p></div>}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-2">
          {onToggleFavorite && <button onClick={e => onToggleFavorite(item.id, e)} className={`p-2 rounded-full transition-all backdrop-blur-md border ${item.isFavorite ? 'bg-red-500/80 border-red-400 text-white shadow-lg' : 'bg-black/30 border-white/20 text-white/80'}`}><Heart size={14} fill={item.isFavorite ? 'currentColor' : 'none'} /></button>}
          {item.productCode && <span className="bg-heritage-gold text-white px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] uppercase tracking-widest font-bold border border-white/20 shadow-lg">ID: {item.productCode}</span>}
          <span className={`px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] uppercase tracking-widest font-bold ${item.status === 'Disponibile' ? 'bg-heritage-olive text-white' : 'bg-heritage-gold/80 text-white'}`}>{item.status}</span>
          {item.catawikiUrl && <a href={item.catawikiUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="bg-[#7B1818] hover:bg-[#5a1212] text-white px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] uppercase tracking-widest font-bold animate-pulse">su Catawiki</a>}
        </div>
      </div>
      <div className="p-3 md:p-6 flex flex-col flex-grow">
        <span className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-heritage-gold block mb-1">{item.category}</span>
        <h3 className="text-[13px] md:text-lg font-serif leading-tight mb-2 line-clamp-2">{item.name}</h3>
        <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-heritage-ink/60 mb-3 font-medium"><MapPin size={10} /><span className="truncate">{item.room}</span></div>
        <div className="flex items-center justify-between text-heritage-gold pt-3 border-t border-heritage-ink/5 mt-auto">
          <div className="flex flex-col">{item.price && <span className="text-[10px] md:text-sm font-serif italic text-heritage-ink mb-1">{item.price}</span>}<span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Dettagli</span></div>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

function ImageGallery({ images, name, status, catawikiUrl }: { images: string[]; name: string; status: string; catawikiUrl?: string }) {
  const [idx, setIdx] = useState(0);
  const valid = useMemo(() => images.filter(i => i?.trim()), [images]);
  if (!valid.length) return <div className="w-full aspect-[3/4] bg-heritage-ink/5 flex items-center justify-center rounded-2xl"><ImageIcon className="text-heritage-ink/20" size={48} /></div>;
  return (
    <div className="space-y-4">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-heritage-ink/5 bg-white relative group">
        <AnimatePresence mode="wait"><motion.img key={idx} src={valid[idx]} alt={name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-full object-cover" /></AnimatePresence>
        <div className="absolute top-6 left-6 z-10 flex flex-col items-start gap-4">
          <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold ${status === 'Disponibile' ? 'bg-heritage-olive text-white' : status === 'Riservato' ? 'bg-heritage-gold text-white' : 'bg-heritage-ink/40 text-white'}`}>{status}</span>
          {catawikiUrl && <span className="bg-[#7B1818] text-white px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse">su Catawiki</span>}
        </div>
        {valid.length > 1 && (<>
          <button onClick={() => setIdx(p => (p - 1 + valid.length) % valid.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronLeft size={24} /></button>
          <button onClick={() => setIdx(p => (p + 1) % valid.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronRight size={24} /></button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">{valid.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />)}</div>
        </>)}
      </div>
      {valid.length > 1 && <div className="flex gap-2 overflow-x-auto py-2">{valid.map((img, i) => <button key={i} onClick={() => setIdx(i)} className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-heritage-gold scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={img} alt={`${name} ${i}`} className="w-full h-full object-cover" /></button>)}</div>}
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (username: string, pwd: string, token?: string) => void }) {
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('b2026_github_token') || '');
  const [showToken, setShowToken] = useState(false);
  return (
    <form onSubmit={e => { e.preventDefault(); onLogin(username, pwd, token || undefined); }} className="p-8 space-y-6">
      <div className="p-4 bg-heritage-cream/30 rounded-2xl text-sm text-heritage-ink/60 leading-relaxed">
        <p className="font-bold text-xs uppercase tracking-widest text-heritage-ink/40 mb-2">Accesso riservato</p>
        <p>Familiari autorizzati: <strong>Olivia</strong>, <strong>Aleria</strong>, <strong>Emanuela</strong>, <strong>Gianmaria</strong></p>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block">Nome utente</label>
        <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="es. olivia" className="w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-sm transition-colors" required />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block">Password</label>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••••" className="w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-sm transition-colors" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block">GitHub Token <span className="text-heritage-gold">(per salvare online)</span></label>
          <button type="button" onClick={() => setShowToken(!showToken)} className="text-[9px] text-heritage-gold uppercase tracking-widest">{showToken ? 'nascondi' : 'mostra'}</button>
        </div>
        <input type={showToken ? 'text' : 'password'} value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_xxxx (opzionale)" className="w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-sm transition-colors font-mono" />
        <p className="text-[9px] text-heritage-ink/30 italic">Senza token le modifiche restano solo nel browser</p>
      </div>
      <button type="submit" disabled={!username || !pwd} className="w-full heritage-button py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">Accedi</button>
    </form>
  );
}

function HeroImageModal({ isOpen, onClose, onSave, initialUrl }: { isOpen: boolean; onClose: () => void; onSave: (url: string) => void; initialUrl: string }) {
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

function ItemModal({ isOpen, onClose, onSave, initialData, onDelete, nextOrder }: { isOpen: boolean; onClose: () => void; onSave: (item: HeritageItem) => Promise<void>; initialData?: HeritageItem | null; onDelete?: (id: string) => void; nextOrder: number; }) {
  const [form, setForm] = useState({ ...emptyForm, order: nextOrder });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) { setForm({ name: initialData.name || '', description: initialData.description || '', room: initialData.room || '', category: initialData.category || '', year: initialData.year || '', dimensions: initialData.dimensions || '', status: initialData.status || 'Disponibile', acquisitionType: initialData.acquisitionType || 'Vendita', price: initialData.price || '', catawikiUrl: initialData.catawikiUrl || '', imageUrl: initialData.imageUrl || '', technicalNotes: initialData.technicalNotes || '', destination: initialData.destination || 'Barberino', estimatedValue: initialData.estimatedValue || '', productCode: initialData.productCode || '', isFeatured: initialData.isFeatured || false, order: initialData.order, details: initialData.details || [], images: initialData.images || [] }); }
    else setForm({ ...emptyForm, order: nextOrder });
  }, [initialData, isOpen, nextOrder]);

  const handleImageUpload = async (src: string | File) => {
    setIsProcessingImage(true);
    try {
      const r = await resizeImage(src);
      // Try to upload to GitHub if token available
      const token = localStorage.getItem('b2026_github_token');
      if (token && src instanceof File) {
        const fileName = `${Date.now()}-${src.name.replace(/[^a-z0-9.]/gi, '-')}`;
        const url = await uploadImageToGitHub(r, fileName);
        if (url) { setForm(p => ({ ...p, imageUrl: url })); return; }
      }
      setForm(p => ({ ...p, imageUrl: r }));
    } catch { alert("Errore immagine."); }
    finally { setIsProcessingImage(false); }
  };

  const handleAnalyze = async () => {
    if (!form.imageUrl) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeImageWithClaude(form.imageUrl);
      if (result) {
        setForm(p => ({
          ...p,
          name: (result as any).name || p.name,
          description: (result as any).description || p.description,
          category: (result as any).category || p.category,
          room: (result as any).room || p.room,
          year: (result as any).year || p.year,
          dimensions: (result as any).dimensions || p.dimensions,
          price: (result as any).price || p.price,
        }));
      } else { alert('Nessun risultato. Riprova con una foto più nitida.'); }
    } catch (e: any) { alert('Errore: ' + e.message); }
    finally { setIsAnalyzing(false); }
  };

  const handleDetailImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    setIsProcessingImage(true);
    const imgs = [...form.images];
    const token = localStorage.getItem('b2026_github_token');
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          const r = await resizeImage(file);
          if (token) {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
            const url = await uploadImageToGitHub(r, fileName);
            imgs.push(url || r);
          } else {
            imgs.push(r);
          }
        } catch {}
      }
    }
    setForm(p => ({ ...p, images: imgs })); setIsProcessingImage(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try { await onSave({ ...form, id: initialData?.id || genId(), stories: initialData?.stories || [] }); }
    finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between"><h3 className="text-2xl font-serif">{initialData ? `Modifica: ${initialData.name}` : 'Nuovo Oggetto'}</h3><button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button></div>
          <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto space-y-6">
            {/* Image upload */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-4">Immagine Principale</label>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageUpload(f); }} className={`relative h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden ${isDragging ? 'border-heritage-gold bg-heritage-gold/5' : 'border-heritage-ink/10 bg-heritage-cream/10'} ${form.imageUrl ? 'border-solid border-heritage-gold/30' : ''}`}>
                {form.imageUrl ? (<><img src={form.imageUrl} className={`absolute inset-0 w-full h-full object-cover ${isProcessingImage ? 'opacity-30 blur-sm' : 'opacity-80'}`} />{isProcessingImage && <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}<div className="absolute inset-0 bg-heritage-ink/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="bg-white text-heritage-ink px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">Rimuovi</button></div></>) : (<><div className="p-4 bg-white rounded-full shadow-sm text-heritage-ink/30">{isProcessingImage ? <div className="w-6 h-6 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /> : <Upload size={24} />}</div><p className="text-sm font-medium">{isProcessingImage ? 'Elaborazione...' : "Trascina o"}</p>{!isProcessingImage && <label className="text-xs text-heritage-gold cursor-pointer hover:underline">sfoglia<input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} /></label>}</>)}
              </div>
              <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold text-xs mt-2" placeholder="oppure incolla un URL..." />
              {form.imageUrl && (
                <button type="button" onClick={handleAnalyze} disabled={isAnalyzing} className={`mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${isAnalyzing ? 'bg-heritage-gold/20 text-heritage-gold border-heritage-gold/20 cursor-wait' : 'bg-heritage-gold text-white border-heritage-gold hover:bg-heritage-gold/90 shadow-md'}`}>
                  {isAnalyzing ? (<><div className="w-4 h-4 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />Analisi in corso...</>) : (<><Sparkles size={14} />Analizza con Claude — compila i campi automaticamente</>)}
                </button>
              )}
            </div>
            {/* Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              {[{ l: 'Nome *', k: 'name', p: 'Es. Scrittoio in Noce', span: 2, req: true }, { l: 'Stanza *', k: 'room', p: 'Es. Salotto', req: true }, { l: 'Anno/Epoca', k: 'year', p: 'Es. 1850 circa' }, { l: 'Dimensioni', k: 'dimensions', p: 'Es. 120x60x80 cm' }, { l: 'Prezzo', k: 'price', p: '€ 500' }, { l: 'Valore Stimato', k: 'estimatedValue', p: '€ 1.500' }, { l: 'Codice / SKU', k: 'productCode', p: 'ART-001' }].map(f => (
                <div key={f.k} className={`space-y-2 ${(f as any).span === 2 ? 'md:col-span-2' : ''}`}>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-40">{f.l}</label>
                  <input required={f.req} value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold" placeholder={f.p} />
                </div>
              ))}
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Categoria *</label>
                <input required list="cat-list" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold" placeholder="Es. Mobili" />
                <datalist id="cat-list"><option value="Mobili" /><option value="Illuminazione" /><option value="Sedute" /><option value="Quadri" /><option value="Porcellane" /><option value="Tappeti" /><option value="Giardino" /></datalist>
                <div className="flex flex-wrap gap-2">{['Mobili', 'Illuminazione', 'Sedute', 'Quadri'].map(c => <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c }))} className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-bold ${form.category === c ? 'bg-heritage-olive text-white' : 'bg-heritage-ink/5 text-heritage-ink/40'}`}>{c}</button>)}</div>
              </div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Descrizione *</label><textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold resize-none h-24" placeholder="Racconta la storia..." /></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Dettagli Tecnici</label><textarea value={form.technicalNotes} onChange={e => setForm(p => ({ ...p, technicalNotes: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold resize-none h-20" placeholder="Materiali, stato..." /></div>
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Stato</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm"><option value="Disponibile">Disponibile</option><option value="Riservato">Riservato</option><option value="Affidato">Affidato</option><option value="Non in Vendita">Non in Vendita</option></select></div>
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Destinazione</label><select value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none"><option value="Barberino">Barberino</option><option value="Torino">Torino</option><option value="Sorella">Sorella</option><option value="Altro">Altro</option></select></div>
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Tipo Acquisizione</label><select value={form.acquisitionType} onChange={e => setForm(p => ({ ...p, acquisitionType: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none"><option value="Vendita">Vendita</option><option value="Lascito Affettivo">Lascito Affettivo</option><option value="Famiglia">Famiglia</option></select></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Link Catawiki</label><input value={form.catawikiUrl} onChange={e => setForm(p => ({ ...p, catawikiUrl: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm" placeholder="https://www.catawiki.com/..." /></div>
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Ordine</label><input type="number" value={form.order === undefined ? '' : form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value ? parseInt(e.target.value) : undefined }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm" placeholder="1 = primo" /></div>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}>
                <div className="relative"><div className={`w-10 h-5 rounded-full transition-colors ${form.isFeatured ? 'bg-heritage-gold' : 'bg-heritage-ink/10'}`} /><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} /></div>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">In evidenza (Home)</span>
              </div>
            </div>
            {/* Gallery */}
            <div className="p-4 bg-heritage-cream/10 rounded-2xl border border-heritage-ink/5">
              <div className="flex items-center justify-between mb-4"><label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Gallery Foto</label><label className="text-[10px] uppercase font-bold text-heritage-gold cursor-pointer flex items-center gap-1"><Plus size={12} /> Aggiungi<input type="file" className="hidden" accept="image/*" multiple onChange={handleDetailImages} /></label></div>
              <div className="flex flex-wrap gap-3">{form.images.map((img, i) => <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-heritage-ink/10"><img src={img} className="w-full h-full object-cover" /><button type="button" onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} className="absolute inset-0 bg-red-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><Trash2 size={16} className="text-white" /></button></div>)}{form.images.length === 0 && <p className="text-[10px] italic text-heritage-ink/30 w-full text-center py-4 border border-dashed border-heritage-ink/10 rounded-xl">Nessuna foto aggiuntiva</p>}</div>
            </div>
            <div className="flex gap-4 pt-2">
              {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-6 py-4 rounded-xl border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} />Elimina</button>}
              <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}</button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
