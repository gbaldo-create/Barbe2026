// v2026-05-22
import React, { useState, useMemo, useEffect, useRef, useCallback, MouseEvent, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  Archive, Menu, X, Plus, SlidersHorizontal, MapPin, History, ChevronLeft,
  ChevronRight, Share2, Twitter, Facebook, Mail, ArrowLeft, ArrowRight, ExternalLink,
  Heart, Handshake, Camera, User, Upload, LogOut, Edit, Trash2,
  Image as ImageIcon, Check, Download, BookHeart, Users, KeyRound,
} from 'lucide-react';
import { HeritageItem, Memory, ViewType } from './types.ts';
import { api, ApiError, permissions, ROLE_LABELS, type SessionUser } from './api';
import ITEMS_DATA from '../data/items.json';
import SETTINGS_DATA from '../data/settings.json';
import { AntiquarianSection } from './components/AntiquarianSection';
import { DesktopMemoriesView } from './components/DesktopMemoriesView';
import { ExplorePanel } from './components/ExplorePanel';
import { HeroImageModal } from './components/HeroImageModal';
import { ImageGallery, ItemCard } from './components/ItemCard';
import { Lightbox } from './components/Lightbox';
import { LoginForm } from './components/LoginForm';
import { MemoriesReelV2, ReelCover } from './components/MemoriesReelV2';
import { WhatsAppIcon } from './components/icons';
import { DetailBox, NavItem, ScrollReveal } from './components/ui';
import { prepareCatawikiWithAI } from './lib/ai';
import { downloadJson, exportCatawikiTxt, exportSingleCatawiki } from './lib/exports';
import { GITHUB_BRANCH, GITHUB_OWNER, GITHUB_PATH, GITHUB_REPO, MEMORIES_PATH, saveSettingsRemote, uploadImage } from './lib/remote';
import { FamilyMemory, genId, getAdozioneLabel, getPublicBadge, isAdozione, orderMemories } from './lib/shared';

// Finestre usate solo da chi modifica: caricate al primo utilizzo, così i visitatori scaricano meno codice
const CatawikiModal = lazy(() => import('./components/CatawikiModal').then(m => ({ default: m.CatawikiModal })));
const ItemModal = lazy(() => import('./components/ItemModal').then(m => ({ default: m.ItemModal })));
const MemoriesReelView = lazy(() => import('./components/MemoriesReel').then(m => ({ default: m.MemoriesReelView })));
const MemoryModal = lazy(() => import('./components/MemoryModal').then(m => ({ default: m.MemoryModal })));
const UsersAdminModal = lazy(() => import('./components/UsersAdmin').then(m => ({ default: m.UsersAdminModal })));
const ChangePasswordModal = lazy(() => import('./components/UsersAdmin').then(m => ({ default: m.ChangePasswordModal })));

const INITIAL_ITEMS: HeritageItem[] = ITEMS_DATA as HeritageItem[];

export default function App() {
  const [view, setView] = useState<ViewType>(() => (sessionStorage.getItem('b2026_view') as ViewType) || 'home');
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const { scrollY } = useScroll();
  // Parallax hero: su mobile ridotto (max 40px), su desktop fino a 100px
  const heroParallax = useTransform(scrollY, [0, 600], [0, typeof window !== "undefined" && window.innerWidth < 768 ? 40 : 100]);
  const [items, setItems] = useState<HeritageItem[]>(() => {
    try { const c = localStorage.getItem('b2026_items'); return c ? JSON.parse(c) : INITIAL_ITEMS; }
    catch { return INITIAL_ITEMS; }
  });
  const hasItemParam = new URLSearchParams(window.location.search).has('item');
  const alreadySeen = sessionStorage.getItem('b2026_loader_seen') === '1' || hasItemParam;
  const [isLoading, setIsLoading] = useState(!alreadySeen);
  const [dismissed, setDismissed] = useState(alreadySeen);
  const [loaderQuote, setLoaderQuote] = useState<{ text: string; author: string } | null>(null);
  const [loaderIndex, setLoaderIndex] = useState(() => 0); // verrà aggiornato al primo caricamento
  const [loaderFromMenu, setLoaderFromMenu] = useState(false);
  const loaderFromMenuRef = useRef(false);
  const [showLoaderCover, setShowLoaderCover] = useState(false);
  useEffect(() => { loaderFromMenuRef.current = loaderFromMenu; }, [loaderFromMenu]);
  const [selectedItem, setSelectedItem] = useState<HeritageItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [selectedStatus, setSelectedStatus] = useState('Tutti');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showNuovoDropdown, setShowNuovoDropdown] = useState(false);

  // Scroll robusto a una sezione
  const scrollToSection = (id: string, fromView?: string) => {
    const doScroll = (attempts = 0) => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (attempts < 10) { setTimeout(() => doScroll(attempts + 1), 80); }
    };
    if (fromView && fromView !== 'home') { setView('home'); setTimeout(() => doScroll(), 150); }
    else { doScroll(); }
  };

  // ── 🧪 Lab mode — visibile solo a gianmaria ──────────────────────────────
  const [labFeatures, setLabFeatures] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('b2026_lab') || '{}'); } catch { return {}; }
  });
  const isLab = (feature: string) => currentUser === 'gianmaria' && !!labFeatures[feature];
  const toggleLab = (feature: string) => {
    setLabFeatures(prev => {
      const next = { ...prev, [feature]: !prev[feature] };
      try { localStorage.setItem('b2026_lab', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [memories, setMemories] = useState<FamilyMemory[]>(() => {
    // nel browser si tengono solo i ricordi pubblici; i privati arrivano dal server dopo l'accesso
    try { const c = localStorage.getItem('b2026_memories'); return c ? JSON.parse(c).filter((m: FamilyMemory) => m.visibility !== 'private') : []; }
    catch { return []; }
  });
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<FamilyMemory | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeritageItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(() => localStorage.getItem('b2026_hero') || (SETTINGS_DATA as any).heroImageUrl || 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=2000');
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [explorePanelMode, setExplorePanelMode] = useState<'discover' | 'filter'>('discover');
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('b2026_favs') || '[]'); } catch { return []; } });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isExplorePanelOpen, setIsExplorePanelOpen] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<((r: string) => boolean) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [isCatawikiModalOpen, setIsCatawikiModalOpen] = useState(false);
  const [catawikiItem, setCatawikiItem] = useState<HeritageItem | null>(null);
  const [isPreparingCatawiki, setIsPreparingCatawiki] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');

  // Multi-user auth
  // ── sessione (cookie gestito dal server) ──
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const currentUser = sessionUser?.username ?? null;
  const perms = permissions(sessionUser);
  const [isUsersAdminOpen, setIsUsersAdminOpen] = useState(false);
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  useEffect(() => {
    // vecchio sistema: token GitHub e utente salvati nel browser non servono più
    localStorage.removeItem('b2026_github_token');
    sessionStorage.removeItem('b2026_user');
    api.me().then(u => { setSessionUser(u); if (u?.mustChangePassword) setIsChangePwOpen(true); }).catch(() => {});
  }, []);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isAdmin = perms.canEditItems; // può modificare il catalogo (amministratore o editor)

  // ricordi privati: li fornisce il server solo a chi ha fatto l'accesso
  useEffect(() => {
    if (!currentUser) { setMemories(prev => prev.filter(m => m.visibility !== 'private')); return; }
    api.memories<FamilyMemory>().then(list => setMemories(list)).catch(() => {});
  }, [currentUser]);

  // visibleMemories: public always; private only for logged-in users
  const visibleMemories = useMemo(() =>
    memories.filter(m => !!currentUser || !m.visibility || m.visibility === 'public'),
  [memories, currentUser]);
  const shuffledMemories = useMemo(() => orderMemories(visibleMemories), [visibleMemories]);

  useEffect(() => {
    if (alreadySeen) return;
    setTimeout(() => {
      setIsLoading(false);
      sessionStorage.setItem('b2026_loader_seen', '1');
      setDismissed(true);
      setShowLoaderCover(false);
    }, 3000);
  }, []);

  // Al primo caricamento scegli un ricordo pubblico random + precarica le foto
  useEffect(() => {
    if (shuffledMemories.length > 0) {
      const publicMems = shuffledMemories.filter(m => m.visibility !== 'private');
      const pool = publicMems.length > 0 ? publicMems : shuffledMemories;
      const randomIdx = shuffledMemories.indexOf(pool[Math.floor(Math.random() * pool.length)]);
      setLoaderIndex(randomIdx >= 0 ? randomIdx : 0);
      setLoaderQuote({ text: shuffledMemories[randomIdx]?.text || '', author: shuffledMemories[randomIdx]?.author || '' });
      // Precarica la foto del ricordo scelto mentre l'orologio gira
      const mem = shuffledMemories[randomIdx >= 0 ? randomIdx : 0];
      if (mem?.imageUrl) {
        const img = new window.Image();
        img.src = mem.imageUrl;
      }
      // Precarica anche le prossime 3 per navigazione desktop
      [1,2,3].forEach(offset => {
        const m = shuffledMemories[(randomIdx + offset) % shuffledMemories.length];
        if (m?.imageUrl) { const i = new window.Image(); i.src = m.imageUrl; }
      });
    }
  }, [shuffledMemories.length]); // solo al primo caricamento

  useEffect(() => {
    sessionStorage.setItem('b2026_view', view);
    if (view === 'item-detail' && selectedItem) {
      sessionStorage.setItem('b2026_item_id', selectedItem.id);
    } else {
      sessionStorage.removeItem('b2026_item_id');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view, selectedItem?.id]);


  useEffect(() => {
    // Ripristina da URL ?item=ID (link condivisi)
    const p = new URLSearchParams(window.location.search);
    const urlId = p.get('item');
    if (urlId) {
      const it = items.find(i => i.id === urlId);
      if (it) { setSelectedItem(it); setView('item-detail'); }
      window.history.replaceState({ view: 'item-detail', itemId: urlId }, '', `?item=${urlId}`);
      return;
    }
    // Ripristina da sessionStorage (refresh normale)
    const savedView = sessionStorage.getItem('b2026_view') as ViewType;
    const savedItemId = sessionStorage.getItem('b2026_item_id');
    if (savedView === 'item-detail' && savedItemId) {
      const it = items.find(i => i.id === savedItemId);
      if (it) { setSelectedItem(it); setView('item-detail'); }
    }
  }, [items]);

  // Browser back/forward support
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Loader aperto da menu — torna alla home
      if (viewRef.current !== 'memories-reel-v2' && loaderFromMenuRef.current) {
        setDismissed(true);
        setLoaderFromMenu(false);
        setShowLoaderCover(false);
        return;
      }
      // Se il reel era aperto, torna alla home senza uscire dal sito
      if (viewRef.current === 'memories-reel-v2') {
        setView('home');
        return;
      }
      // Controlla anche URL params
      const p = new URLSearchParams(window.location.search);
      const urlId = p.get('item');
      if (urlId) {
        const found = items.find(i => i.id === urlId);
        if (found) { setSelectedItem(found); setView('item-detail'); return; }
      }
      if (e.state?.view === 'item-detail' && e.state?.itemId) {
        const found = items.find(i => i.id === e.state.itemId);
        if (found) { setSelectedItem(found); setView('item-detail'); }
      } else if (e.state?.view) {
        setView(e.state.view as ViewType);
        setSelectedItem(null);
        sessionStorage.removeItem('b2026_item_id');
      } else {
        setView('home');
        setSelectedItem(null);
        sessionStorage.removeItem('b2026_item_id');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [items]);

  // ── sync from GitHub on mount — GitHub è sempre source of truth ──
  const [isSyncing, setIsSyncing] = useState(true);
  useEffect(() => {
    const fetchFromGitHub = async () => {
      setIsSyncing(true);
      try {
        // Carica memories.json
        try {
          const memUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${MEMORIES_PATH}?t=${Date.now()}`;
          const memRes = await fetch(memUrl);
          if (memRes.ok) {
            const memData: FamilyMemory[] = await memRes.json();
            // Preserva i flag pinned dalla localStorage se GitHub non li ha ancora
            // (raw.githubusercontent può essere in ritardo rispetto al push)
            try {
              const local = localStorage.getItem('b2026_memories');
              if (local) {
                const localMems: FamilyMemory[] = JSON.parse(local);
                const localPins = new Map(localMems.filter(m => m.pinned).map(m => [m.id, true]));
                if (localPins.size > 0) {
                  memData.forEach(m => { if (localPins.has(m.id)) m.pinned = true; });
                }
              }
            } catch {}
            const publicMems = memData.filter(m => m.visibility !== 'private');
            // conserva i privati già arrivati dal server (se l'utente è collegato)
            setMemories(prev => [...publicMems, ...prev.filter(m => m.visibility === 'private' && !publicMems.some(p => p.id === m.id))]);
            try { localStorage.setItem('b2026_memories', JSON.stringify(publicMems)); } catch {}
          }
        } catch {}

        const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_PATH}?t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data: HeritageItem[] = await res.json();
        setItems(data);
        try {
          const forStorage = data.map(item => ({
            ...item,
            imageUrl: item.imageUrl?.startsWith('data:') ? '' : item.imageUrl,
            images: (item.images || []).filter(img => !img.startsWith('data:')),
          }));
          localStorage.setItem('b2026_items', JSON.stringify(forStorage));
        } catch {}
      } catch (e) {
        console.warn('Fetch GitHub fallito, uso dati locali/bundle', e);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchFromGitHub();
  }, []); // solo al mount

  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── GitHub token state ──
  useEffect(() => {
    const anyOpen = isItemModalOpen || isLoginModalOpen || isHeroModalOpen || isUsersAdminOpen || isChangePwOpen || isExplorePanelOpen || isMemoryModalOpen || isMobileMenuOpen || showAdminDropdown;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    if (anyOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => { document.body.style.overflow = ''; document.body.style.paddingRight = ''; };
  }, [isItemModalOpen, isLoginModalOpen, isHeroModalOpen, isUsersAdminOpen, isChangePwOpen, isExplorePanelOpen, isMemoryModalOpen, isMobileMenuOpen, showAdminDropdown]);

  // ── persist ──
  const persist = async (updated: HeritageItem[]) => {
    const prev = items;
    setItems(updated);
    try {
      const r = await api.saveItems(prev, updated);
      // il server restituisce il catalogo aggiornato, incluse modifiche fatte nel frattempo da altri
      const saved = (r.items as HeritageItem[] | null) || updated;
      setItems(saved);
      const forStorage = saved.map(({ isFavorite, ...item }) => ({
        ...item,
        imageUrl: item.imageUrl?.startsWith('data:') ? '' : item.imageUrl,
        images: (item.images || []).filter(img => !img.startsWith('data:')),
      }));
      try { localStorage.setItem('b2026_items', JSON.stringify(forStorage)); } catch {}
      showNotif('Salvato ✓');
      return true;
    } catch (e) {
      setItems(prev);
      showNotif(e instanceof ApiError ? e.message : 'Salvataggio non riuscito: controlla la connessione', 'error');
      return false;
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
    return { ...item, category, imageUrl, images: item.images || [], isFavorite: favorites.includes(item.id) };
  }).sort((a: any, b: any) => {
    const ha = a.order != null, hb = b.order != null;
    if (ha && hb) return Number(a.order) - Number(b.order);
    if (ha) return -1; if (hb) return 1; return 0;
  }), [items, favorites]);

  const currentItem = useMemo(() => selectedItem ? mergedItems.find(i => i.id === selectedItem.id) || null : null, [selectedItem, mergedItems]);
  const relatedItems = useMemo(() => currentItem ? mergedItems.filter(i => i.id !== currentItem.id && (i.category === currentItem.category || i.room === currentItem.room)).slice(0, 3) : [], [currentItem, mergedItems]);
  const currentItemIndex = useMemo(() => currentItem ? mergedItems.findIndex(i => i.id === currentItem.id) : -1, [currentItem, mergedItems]);
  const prevItem = useMemo(() => currentItemIndex > 0 ? mergedItems[currentItemIndex - 1] : null, [currentItemIndex, mergedItems]);
  const nextItem = useMemo(() => currentItemIndex < mergedItems.length - 1 ? mergedItems[currentItemIndex + 1] : null, [currentItemIndex, mergedItems]);

  const categoriesWithCount = useMemo(() => {
    const c: Record<string, number> = {};
    mergedItems.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return [{ name: 'Tutti', count: mergedItems.length }, ...Object.keys(c).sort().map(n => ({ name: n, count: c[n] }))];
  }, [mergedItems]);

  const statusFilters = ['Tutti', 'In vendita', 'Su Catawiki', 'In adozione'];

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedItems.filter(item => {
      const mc = selectedCategory === 'Tutti' || item.category === selectedCategory;
      const mf = !showFavoritesOnly || item.isFavorite;
      const mr = !selectedRoomFilter || selectedRoomFilter(item.room || '');
      const mq = !q || item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.room?.toLowerCase().includes(q);
      let ms = true;
      if (selectedStatus !== 'Tutti') {
        if (selectedStatus === 'In vendita') ms = item.status === 'Disponibile' && !item.catawikiUrl?.trim();
        else if (selectedStatus === 'Su Catawiki') ms = !!item.catawikiUrl?.trim();
        else if (selectedStatus === 'In adozione') ms = item.status === 'Affidato';
      }
      return mc && mf && ms && mr && mq;
    });
  }, [mergedItems, selectedCategory, selectedStatus, showFavoritesOnly, selectedRoomFilter, searchQuery]);

  // Reset visibleCount when filters change
  useEffect(() => { setVisibleCount(12); }, [selectedCategory, selectedStatus, selectedRoomFilter, searchQuery, showFavoritesOnly]);

  // ── infinite scroll ──
  // Callback ref: l'observer si aggancia ogni volta che il box "Carico altri..." entra nel DOM
  // (anche dopo reload, cambio vista o animazioni), non solo quando cambiano le dipendenze.
  const filteredCountRef = useRef(0);
  filteredCountRef.current = filteredItems.length;
  const loaderElRef = useRef<HTMLDivElement | null>(null);
  const loaderObserverRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useCallback((el: HTMLDivElement | null) => {
    loaderObserverRef.current?.disconnect();
    loaderObserverRef.current = null;
    loaderElRef.current = el;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(v => Math.min(v + 12, filteredCountRef.current));
      }
    }, { rootMargin: '0px 0px 300px 0px' });
    obs.observe(el);
    loaderObserverRef.current = obs;
  }, []);
  // Se dopo aver aggiunto oggetti il loader è ancora visibile, ricontrolla e carica il blocco successivo
  useEffect(() => {
    const obs = loaderObserverRef.current, el = loaderElRef.current;
    if (obs && el) { obs.unobserve(el); obs.observe(el); }
  }, [visibleCount, filteredItems.length]);

  const handleBackToCatalog = (target: ViewType = 'catalog') => {
    window.history.pushState({ view: target }, '', window.location.pathname);
    sessionStorage.removeItem('b2026_item_id');
    setSelectedCategory('Tutti'); setSelectedStatus('Tutti');
    setSelectedRoomFilter(null);
    setSearchQuery('');
    setVisibleCount(12);
    setShowFavoritesOnly(false); setView(target);
    setSelectedItem(null); setIsMobileMenuOpen(false);
  };

  const handleExploreConfirm = ({ category, roomMatch, catawikiOnly }: { category?: string; roomMatch?: (r: string) => boolean; catawikiOnly?: boolean }) => {
    setSelectedCategory(category || 'Tutti');
    setSelectedStatus(catawikiOnly ? 'Su Catawiki' : 'Tutti');
    setSelectedRoomFilter(roomMatch ? () => roomMatch : null);
    setSearchQuery('');
    setVisibleCount(12);
    setShowFavoritesOnly(false);
    setSelectedItem(null);
    window.history.pushState({ view: 'catalog' }, '', window.location.pathname);
    setView('catalog');
  };

  const openItem = (item: HeritageItem) => {
    setSelectedItem(item);
    setView('item-detail');
    window.history.pushState({ view: 'item-detail', itemId: item.id }, '', `?item=${item.id}`);
  };

  const handlePrepareCatawiki = async (item: HeritageItem) => {
    setIsPreparingCatawiki(true);
    try {
      const result = await prepareCatawikiWithAI(item);
      if (result) {
        // Merge risultato AI con dati esistenti dell'oggetto
        const enriched: HeritageItem = {
          ...item,
          catawikiTitle: result.catawikiTitle || item.catawikiTitle || item.name.slice(0, 60),
          catawikiCategory: result.catawikiCategory || item.catawikiCategory || '',
          catawikiSubcategory: result.catawikiSubcategory || item.catawikiSubcategory || '',
          catawikiStyle: result.catawikiStyle || item.catawikiStyle || '',
          catawikiMaterial: result.catawikiMaterial || item.catawikiMaterial || '',
          catawikiCountry: result.catawikiCountry || item.catawikiCountry || 'Italia',
          catawikiRestored: (result as any).catawikiRestored ?? item.catawikiRestored ?? false,
          catawikiDescription: result.catawikiDescription || item.catawikiDescription || '',
          catawikiShippingAvailable: item.catawikiShippingAvailable ?? (item.shipping === 'Spedizione possibile'),
          catawikiPickupAvailable: item.catawikiPickupAvailable ?? true,
          catawikiImages: item.catawikiImages?.length ? item.catawikiImages :
            [item.imageUrl, ...(item.images || [])].filter(Boolean).slice(0, 5) as string[],
        };
        setCatawikiItem(enriched);
        setIsCatawikiModalOpen(true);
      } else {
        alert('Nessun risultato. Riprova.');
      }
    } catch (e: any) { alert('Errore: ' + e.message); }
    finally { setIsPreparingCatawiki(false); }
  };

  const handleSaveCatawikiData = async (updated: HeritageItem) => {
    await persist(items.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
    setCatawikiItem(null);
    setIsCatawikiModalOpen(false);
    showNotif('Scheda Catawiki salvata ✓');
  };

  const toggleFavorite = (itemId: string, e?: React.MouseEvent | MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      localStorage.setItem('b2026_favs', JSON.stringify(next));
      return next;
    });
  };

  const toggleFeatured = async (itemId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const updated = items.map(i => i.id === itemId ? { ...i, isFeatured: !i.isFeatured } : i);
    await persist(updated);
    showNotif(updated.find(i => i.id === itemId)?.isFeatured ? '★ In evidenza' : 'Rimosso dall\'evidenza');
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
    // Aggiorna selectedItem così la scheda riflette subito le modifiche
    if (editingItem && selectedItem?.id === editingItem.id) {
      setSelectedItem(itemData);
    }
    setIsItemModalOpen(false); setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    await persist(items.filter(i => i.id !== itemId));
    setItemToDelete(null); handleBackToCatalog();
    showNotif('Oggetto eliminato');
  };

  const handleLogin = async (username: string, pwd: string) => {
    try {
      const u = await api.login(username, pwd);
      setSessionUser(u);
      setIsLoginModalOpen(false);
      showNotif(`Benvenuto, ${u.displayName}! ✓`);
      if (u.mustChangePassword) setIsChangePwOpen(true);
    } catch (e) {
      showNotif(e instanceof ApiError ? e.message : 'Accesso non riuscito: controlla la connessione', 'error');
    }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    setSessionUser(null);
    showNotif('Logout effettuato');
  };

  // ─── render ───────────────────────────────────────────────────────────────

  // 🧪 Lab: Reel V1 (solo gianmaria)
  if (isLab('memories-reel') && view === 'memories-reel') {
    return <Suspense fallback={null}><MemoriesReelView memories={shuffledMemories} onClose={() => setView('home')} /></Suspense>;
  }
  // Reel V2 — versione ufficiale mobile
  if (view === 'memories-reel-v2') {
    return <MemoriesReelV2 memories={shuffledMemories} onClose={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-heritage-cream overflow-x-hidden">

      {/* Loader */}
      <AnimatePresence>
        {(isLoading || !dismissed) && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-heritage-cream px-6">
            {/* Cover mosaico — solo quando aperto da menu/hero su desktop */}
            {showLoaderCover && loaderFromMenu && (
              <ReelCover
                memories={shuffledMemories}
                onStart={() => setShowLoaderCover(false)}
              />
            )}
            <AnimatePresence mode="wait">
              {loaderFromMenu ? (
                <DesktopMemoriesView memories={shuffledMemories} loaderIndex={loaderIndex} setLoaderIndex={setLoaderIndex} />
              ) : (
                <motion.div key="loader-clock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-8">
                  <p className="text-heritage-ink/35 text-[11px] uppercase tracking-[0.22em] font-sans">BARBERINO …./2026</p>
                  <svg ref={(el) => {
                    if (!el || el.dataset.ticks) return;
                    el.dataset.ticks = '1';
                    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
                    for (let i = 0; i < 60; i++) {
                      const angle = (i/60)*Math.PI*2;
                      const isHour = i%5===0;
                      const r1 = 39, r2 = isHour ? 31 : 35;
                      const x1 = 50+Math.sin(angle)*r1, y1 = 50-Math.cos(angle)*r1;
                      const x2 = 50+Math.sin(angle)*r2, y2 = 50-Math.cos(angle)*r2;
                      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
                      line.setAttribute('x1',String(x1)); line.setAttribute('y1',String(y1));
                      line.setAttribute('x2',String(x2)); line.setAttribute('y2',String(y2));
                      line.setAttribute('stroke', isHour ? 'rgba(107,79,34,0.55)' : 'rgba(107,79,34,0.2)');
                      line.setAttribute('stroke-width', isHour ? '1.5' : '0.6');
                      line.setAttribute('stroke-linecap','round');
                      g.appendChild(line);
                    }
                    el.insertBefore(g, el.firstChild.nextSibling);
                  }} width="120" height="120" viewBox="0 0 100 100">
                    <style>{`
                      @keyframes clockBack { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                      @keyframes clockBackSlow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                    `}</style>
                    <circle cx="50" cy="50" r="44" fill="rgba(251,246,237,0.5)" stroke="rgba(197,160,89,0.3)" strokeWidth="0.8"/>
                    <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(197,160,89,0.1)" strokeWidth="0.4"/>
                    <g style={{transformOrigin:'50px 50px', animation:'clockBackSlow 36s linear infinite'}}>
                      <line x1="50" y1="54" x2="50" y2="28" stroke="rgba(58,37,16,0.65)" strokeWidth="2.5" strokeLinecap="round"/>
                    </g>
                    <g style={{transformOrigin:'50px 50px', animation:'clockBack 5s linear infinite'}}>
                      <line x1="50" y1="56" x2="50" y2="13" stroke="#C5A059" strokeWidth="1.2" strokeLinecap="round"/>
                      <polygon points="50,13 48.3,20 51.7,20" fill="#C5A059"/>
                    </g>
                    <circle cx="50" cy="50" r="2.8" fill="#C5A059" stroke="rgba(107,79,34,0.4)" strokeWidth="0.5"/>
                    <circle cx="50" cy="50" r="1" fill="rgba(58,37,16,0.7)"/>
                  </svg>
                  <canvas ref={(el) => {
                    if (!el || (el as any)._morphRunning) return;
                    (el as any)._morphRunning = true;
                    const ctx = el.getContext('2d')!;
                    const W = el.width, H = el.height;
                    const randYear = () => String(Math.floor(Math.random()*(2026-1870+1))+1870);
                    let from = randYear(), to = randYear(), p = 0;
                    const loop = () => {
                      p += 0.055;
                      if (p >= 1) { p = 0; from = to; to = randYear(); }
                      const t = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
                      ctx.clearRect(0,0,W,H);
                      ctx.font = 'italic 48px Georgia, serif';
                      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                      ctx.save(); ctx.globalAlpha=1-t; ctx.filter=`blur(${(t*5).toFixed(1)}px)`; ctx.fillStyle='#1C1A16'; ctx.fillText(from,W/2,H/2); ctx.restore();
                      ctx.save(); ctx.globalAlpha=t; ctx.filter=`blur(${((1-t)*5).toFixed(1)}px)`; ctx.fillStyle='#1C1A16'; ctx.fillText(to,W/2,H/2); ctx.restore();
                      requestAnimationFrame(loop);
                    };
                    loop();
                  }} width={180} height={64} style={{display:'block'}} />
                  <p className="text-heritage-ink/45 text-xl font-heritage italic tracking-wide">Sto raccogliendo memorie e oggetti...</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-8 h-14 flex items-center justify-center">
              {loaderFromMenu && (
                <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setDismissed(true); setLoaderFromMenu(false); setShowLoaderCover(false); }} className="px-10 py-4 bg-heritage-ink text-heritage-cream rounded-full text-sm font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-heritage-olive transition-colors flex items-center gap-3">
                  Rientra <ArrowRight size={16} />
                </motion.button>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="fixed top-5 md:top-10 left-0 right-0 z-50 px-4 md:px-8 flex justify-center pointer-events-none">
        <header className="w-full max-w-7xl pointer-events-auto bg-emerald-950/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] md:rounded-[3rem] text-white">
          <div className="px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-3">
              {/* Logo — collassato su item-detail */}
              <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => handleBackToCatalog('home')}>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-heritage-gold rounded-full flex items-center justify-center text-emerald-950 group-hover:bg-white transition-colors flex-shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M12 7v5l3 3"/>
                  </svg>
                </div>
                {view === 'item-detail' ? (
                  <span className="text-sm font-bold font-serif text-white leading-none tracking-tight">B26</span>
                ) : (
                  <div>
                    <h1 className="text-sm md:text-lg font-bold font-serif text-white leading-none">Barberino2026</h1>
                    <p className="text-[11px] uppercase tracking-[0.55em] text-heritage-gold/80 font-medium mt-0.5">Archivio</p>
                  </div>
                )}
              </div>
              {/* Back to catalog — solo su item-detail */}
              {view === 'item-detail' && (
                <button onClick={() => handleBackToCatalog()} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors border-l border-white/10 pl-3">
                  <ArrowLeft size={14} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Catalogo</span>
                </button>
              )}
            </motion.div>

            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:flex items-center gap-8">
              <NavItem active={view === 'catalog'} onClick={() => { setExplorePanelMode('discover'); handleBackToCatalog('catalog'); setTimeout(() => setIsExplorePanelOpen(true), view === 'catalog' ? 0 : 300); }} icon={<Archive size={18} />} label="Gli Oggetti di Casa" />
              <NavItem active={false} onClick={() => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 400); }} icon={<Handshake size={18} />} label="Vendita / Adozione" />
              <NavItem active={false} onClick={() => { setLoaderIndex(Math.floor(Math.random() * Math.max(shuffledMemories.length, 1))); setLoaderFromMenu(true); setDismissed(false); }} icon={<Heart size={18} />} label="Ricordi" />
            </motion.nav>

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-2 md:gap-3">
              {isSyncing && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                  <div className="w-3 h-3 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] uppercase tracking-widest font-bold text-white/60">Sync...</span>
                </div>
              )}
              {currentUser ? (
                <div className="flex items-center gap-2 md:gap-3">
                  {isAdmin && <div className="relative hidden sm:block">
                    <div className="flex items-center bg-heritage-gold text-white rounded-full shadow-md overflow-hidden">
                      <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-[12px] font-bold hover:bg-heritage-gold/80 transition-colors">
                        <Plus size={15} /><span className="hidden lg:inline">Nuovo</span>
                      </button>
                      <button onClick={() => setShowNuovoDropdown((v: boolean) => !v)} className="hidden lg:flex items-center px-2 py-2 border-l border-white/20 hover:bg-heritage-gold/80 transition-colors" aria-label="Scegli tipo">
                        <ChevronRight size={13} className={`transition-transform ${showNuovoDropdown ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                    <AnimatePresence>
                      {showNuovoDropdown && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.13 }}
                          className="absolute left-0 top-11 w-44 bg-emerald-950 border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl">
                          <div className="p-1.5 flex flex-col gap-0.5">
                            <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setShowNuovoDropdown(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/85 hover:bg-white/10 transition-colors text-[12px] text-left font-bold">
                              <Archive size={14} className="text-heritage-gold" /> Oggetto
                            </button>
                            <button onClick={() => { sessionStorage.setItem('b2026_scroll', String(window.scrollY)); setEditingMemory(null); setIsMemoryModalOpen(true); setShowNuovoDropdown(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/85 hover:bg-white/10 transition-colors text-[12px] text-left font-bold">
                              <BookHeart size={14} className="text-heritage-gold" /> Ricordo
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>}
                  <div className="relative">
                    <button
                      onClick={() => { setShowAdminDropdown(!showAdminDropdown); setShowNuovoDropdown(false); setIsMobileMenuOpen(false); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${showAdminDropdown ? 'bg-heritage-gold/20 border-heritage-gold/40 text-heritage-gold' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      <User size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all text-white shadow-sm">
                  <User size={14} /><span className="hidden sm:inline">Accedi</span>
                </button>
              )}
              <button className="lg:hidden w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setShowAdminDropdown(false); }}>
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </motion.div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-emerald-900 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
                <div className="flex flex-col p-6 gap-4">
                  <button onClick={() => { handleBackToCatalog('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); setExplorePanelMode('discover'); setIsMobileMenuOpen(false); setTimeout(() => setIsExplorePanelOpen(true), view === 'catalog' ? 0 : 300); }} className={`flex items-center gap-3 p-3 rounded-xl ${view === 'catalog' ? 'bg-white/10 text-white' : 'text-white/60'}`}><Archive size={20} /><span className="font-heritage text-lg">Gli Oggetti di Casa</span></button>
                  <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('how-it-works', view); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Handshake size={20} /><span className="font-heritage text-lg">Vendita / Adozione</span></button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Heart size={20} /><span className="font-heritage text-lg">Ricordi</span></button>
                </div>
              </motion.div>
            )}
            {/* Admin dropdown — stesso stile hamburger */}
            <AnimatePresence>
            {showAdminDropdown && currentUser && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="bg-emerald-900 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
                <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10">
                  <div className="w-10 h-10 bg-heritage-gold rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">{(sessionUser?.displayName || currentUser).slice(0,2).toUpperCase()}</div>
                  <div>
                    <p className="text-white font-heritage italic text-lg leading-tight">{sessionUser?.displayName || currentUser}</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">{sessionUser ? ROLE_LABELS[sessionUser.role] : ''}</p>
                  </div>
                </div>
                <div className="flex flex-col p-6 gap-4">
                  {perms.canWriteMemories && (<button onClick={() => { sessionStorage.setItem('b2026_scroll', String(window.scrollY)); setEditingMemory(null); setIsMemoryModalOpen(true); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><BookHeart size={20} /><span className="font-heritage text-lg">Gestisci ricordi</span></button>)}
                  {isAdmin && (<>
                  <button onClick={() => { downloadJson(items); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><Download size={20} /><span className="font-heritage text-lg">Scarica items.json</span></button>
                  <button onClick={async () => { if (!confirm('Azzerare il prezzo display di tutti gli oggetti?')) return; const updated = items.map(i => ({ ...i, displayPrice: '' })); await persist(updated); setShowAdminDropdown(false); showNotif('Prezzi aggiornati ✓'); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><Edit size={20} /><span className="font-heritage text-lg">Azzera prezzi display</span></button>
                  <button onClick={() => { exportCatawikiTxt(items); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><ExternalLink size={20} /><span className="font-heritage text-lg">Esporta Catawiki</span></button>
                  </>)}
                  {perms.canManageUsers && (
                    <button onClick={() => { setIsUsersAdminOpen(true); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><Users size={20} /><span className="font-heritage text-lg">Gestione utenti</span></button>
                  )}
                  {sessionUser && !sessionUser.builtin && (
                    <button onClick={() => { setIsChangePwOpen(true); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><KeyRound size={20} /><span className="font-heritage text-lg">Cambia password</span></button>
                  )}
                  {currentUser === 'gianmaria' && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3 font-bold">🧪 Lab</p>
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors" onClick={() => toggleLab('memories-reel')}>
                        <span className="flex items-center gap-3 text-white/60"><BookHeart size={20} /><span className="font-heritage text-lg">Reel Ricordi</span></span>
                        <span className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${labFeatures['memories-reel'] ? 'bg-heritage-gold' : 'bg-white/15'}`}>
                          <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${labFeatures['memories-reel'] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                      </div>
                      {labFeatures['memories-reel'] && (
                        <button onClick={() => { setView('memories-reel'); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-heritage-gold hover:bg-white/10 transition-colors w-full mt-1">
                          <span className="font-heritage text-lg">▶ Apri Reel v1</span>
                        </button>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors mt-1" onClick={() => toggleLab('memories-reel-v2')}>
                        <span className="flex items-center gap-3 text-white/60"><BookHeart size={20} /><span className="font-heritage text-lg">Reel v2 (loader)</span></span>
                        <span className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${labFeatures['memories-reel-v2'] ? 'bg-heritage-gold' : 'bg-white/15'}`}>
                          <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${labFeatures['memories-reel-v2'] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                      </div>
                      {labFeatures['memories-reel-v2'] && (
                        <button onClick={() => { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-heritage-gold hover:bg-white/10 transition-colors w-full mt-1">
                          <span className="font-heritage text-lg">▶ Apri Reel v2</span>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2">
                    <button onClick={() => { handleLogout(); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-red-400/70 hover:bg-red-500/10 transition-colors w-full"><LogOut size={20} /><span className="font-heritage text-lg">Esci</span></button>
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </AnimatePresence>
        </header>
      </motion.div>

      {/* Views */}
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence>

          {/* ── HOME ── */}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full">
              <section className="relative min-h-screen flex items-end overflow-hidden mb-24">
                <motion.div className="absolute inset-0 z-0" style={{ y: heroParallax }}>
                  <img src={heroImageUrl} className="w-full h-full object-cover object-right" alt="Barberino2026" />
                  <div className="absolute inset-0 bg-heritage-ink/10" />
                </motion.div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pb-44 md:pb-20">
                  {perms.canEditSettings && (
                    <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
                      <button onClick={() => setIsHeroModalOpen(true)} title="Cambia sfondo" className="w-9 h-9 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white/60 hover:text-white rounded-full border border-white/10 transition-all">
                        <ImageIcon size={14} />
                      </button>
                    </div>
                  )}
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-md md:max-w-xl lg:max-w-[60%] xl:max-w-[70%] p-6 md:py-6 md:px-0 space-y-3 md:space-y-4">
                    <div>
                      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="text-heritage-gold text-[11px] uppercase tracking-[0.35em] font-bold mb-1 block">1 Corso Corsini</motion.span>
                      <h2 className="text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] leading-[1.02] font-serif text-white italic"><motion.span initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="block">Una casa che <span className="text-heritage-gold not-italic font-display font-bold tracking-tight">cambia,</span></motion.span><motion.span initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="block">memorie che <span className="text-heritage-gold not-italic font-display font-bold tracking-tight">restano.</span></motion.span></h2>
                    </div>
                    <p className="text-base md:text-lg text-white/75 leading-snug font-heritage italic">"Ogni oggetto che parte porta con sé un frammento di noi. Lo affidiamo a chi saprà amarlo."</p>
                    <div className="pt-1 flex flex-wrap items-center gap-3">
                      <button onClick={() => { setExplorePanelMode('discover'); setIsExplorePanelOpen(true); }} className="min-w-[200px] px-7 py-3.5 bg-heritage-gold text-white rounded-full font-bold uppercase tracking-widest text-[11px] md:text-[12px] hover:bg-white hover:text-heritage-ink transition-all shadow-xl group flex items-center justify-center gap-3">
                        Entra in Casa <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button onClick={() => { if (window.innerWidth < 1024) { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); } else { setLoaderIndex(0); setLoaderFromMenu(true); setDismissed(false); setShowLoaderCover(true); history.pushState({ loaderOpen: true }, ""); } }} className="min-w-[200px] px-7 py-3.5 bg-white/10 backdrop-blur-sm text-white border border-white/25 rounded-full font-bold uppercase tracking-widest text-[11px] md:text-[12px] hover:bg-white/20 transition-all group flex items-center justify-center gap-3">
                        Rivivi la storia <Heart size={13} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-4 md:px-6">

                {/* ── SEZIONE 1: IN VENDITA / CATAWIKI / ADOZIONE ── */}
                <section className="border-y border-heritage-gold/15 -mx-4 md:-mx-6 px-4 md:px-6 py-2 md:py-16 mb-0 bg-heritage-cream/40">
                  <div className="max-w-4xl mx-auto">
                    <ScrollReveal><div className="flex items-center gap-3 mb-6"><span className="w-4 h-px bg-heritage-gold" /><span className="text-heritage-gold text-lg">✦</span><span className="w-4 h-px bg-heritage-gold" /></div><span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Scegli il tuo percorso</span>
                    <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Non stiamo vendendo oggetti.</span><br /><span className="font-serif italic text-heritage-gold">Stiamo affidando</span> <span className="font-display font-medium tracking-tight text-heritage-gold not-italic">ricordi.</span></h2>
                    </ScrollReveal>
                    <div className="w-11 h-px bg-heritage-gold opacity-70 my-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                      <ScrollReveal delay={0.05}><div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden h-full">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">€</div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold mb-3 text-[13px]">Acquista</p>
                        <p className="text-[17px] leading-relaxed text-heritage-ink font-heritage">Scegli l'oggetto che ti ha colpito e scrivici. Trattiamo insieme — siamo persone, non un negozio.</p>
                      </div></ScrollReveal>
                      <ScrollReveal delay={0.12}><div className="border border-heritage-gold/25 rounded-2xl p-7 bg-heritage-gold/8 relative overflow-hidden h-full">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-gold/[0.06] leading-none pointer-events-none select-none">⟡</div>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold text-[13px]">Partecipa all'asta</p>
                          <span className="text-[11px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2 py-0.5 rounded-full">asta</span>
                        </div>
                        <p className="text-[17px] leading-relaxed text-heritage-ink font-heritage mb-4">Alcuni pezzi di pregio sono su Catawiki. Fai la tua offerta e portalo a casa attraverso la piattaforma.</p>
                        <div className="bg-heritage-gold/5 border border-heritage-gold/20 rounded-xl p-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2.5 py-1 rounded-full">Su Catawiki</span>
                            <ExternalLink size={10} className="text-heritage-gold/50" />
                          </div>
                          <p className="text-[13px] leading-relaxed text-heritage-ink italic font-heritage">Nel catalogo troverai questo badge con link diretto all'asta.</p>
                        </div>
                      </div></ScrollReveal>
                      <ScrollReveal delay={0.19}><div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden h-full">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">♡</div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold mb-3 text-[13px]">Adotta</p>
                        <p className="text-[17px] leading-relaxed text-heritage-ink font-heritage">Per alcuni oggetti non chiediamo nulla. Solo che vadano nelle mani giuste — qualcuno che li ami come li amava papà.</p>
                      </div></ScrollReveal>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 2: GALLERY IN EVIDENZA ── */}
                <div className="mt-16 md:mt-20 relative pb-8">
                  {/* Header sezione */}
                  <div className="flex items-end justify-between mb-6">
                    <ScrollReveal><div>
                      <span className="text-heritage-gold text-[10px] uppercase tracking-[0.35em] font-bold block mb-2">In evidenza</span>
                      <h3 className="text-4xl md:text-5xl text-heritage-ink leading-tight"><span className="font-serif italic">Da non </span><span className="font-display font-bold tracking-tight text-emerald-950 not-italic">perdere</span></h3>
                    </div></ScrollReveal>
                    <button onClick={() => { setExplorePanelMode('discover'); setIsExplorePanelOpen(true); }} className="group text-[11px] font-bold uppercase tracking-widest text-heritage-gold flex items-center gap-3 hover:opacity-70 transition-opacity">
                      Vedi tutto
                      <span className="w-7 h-7 flex items-center justify-center border border-heritage-gold/30 rounded-full group-hover:bg-heritage-gold group-hover:text-white group-hover:border-heritage-gold transition-all">
                        <ChevronRight size={12} />
                      </span>
                    </button>
                  </div>


                  {/* Mobile: 6 oggetti 1-2-1-2 | Desktop: bento 3col 7 oggetti */}
                  {(() => {
                    const all = [...mergedItems.filter(i => i.isFeatured), ...mergedItems.filter(i => !i.isFeatured)];
                    const m6 = all.slice(0, 6);
                    const [main, b, c, wide, e5, e6, e7] = all.slice(0, 7);

                    const renderCard = (item: typeof main, extraCls: string, h: number, delay = 0) => !item ? null : (
                      <motion.div
                        key={item.id}
                        className={`rounded-2xl overflow-hidden relative cursor-pointer group ${extraCls}`}
                        style={{minHeight: h}}
                        initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay }}
                        onClick={() => openItem(item)}
                      >
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700" /> : <div className="absolute inset-0 bg-heritage-ink/15" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/80 via-heritage-ink/20 to-transparent" />
                        {isAdmin && <button onClick={e => toggleFeatured(item.id, e)} className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all ${item.isFeatured ? 'bg-heritage-gold text-white' : 'bg-black/30 text-white/50 border border-white/20'}`}>★</button>}
                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                          <p className="text-heritage-gold text-[10px] uppercase tracking-[0.2em] font-bold mb-0.5">{item.category}</p>
                          <h4 className="text-white text-[19px] md:text-2xl leading-tight mb-0.5 line-clamp-3 w-[70%]"><span className="font-serif italic">{item.name.split(' ')[0]} </span><span className="font-sans font-bold">{item.name.split(' ').slice(1).join(' ')}</span></h4>
                          {item.catawikiUrl || isAdozione(item)
                            ? null
                            : (item as any).displayPrice && <p className="text-heritage-gold font-serif italic text-xs md:text-sm">{(item as any).displayPrice}</p>}
                        </div>
                      </motion.div>
                    );

                    return (
                      <>
                        {/* MOBILE — 1-2-1-2 */}
                        <div className="md:hidden flex flex-col gap-2">
                          {renderCard(m6[0], '', 300)}
                          <div className="grid grid-cols-2 gap-2">
                            {renderCard(m6[1], '', 200, 0.05)}
                            {renderCard(m6[2], '', 200, 0.1)}
                          </div>
                          {renderCard(m6[3], '', 300, 0.15)}
                          <div className="grid grid-cols-2 gap-2">
                            {renderCard(m6[4], '', 200, 0.2)}
                            {renderCard(m6[5], '', 200, 0.25)}
                          </div>
                        </div>

                        {/* DESKTOP — bento 3col */}
                        <div className="hidden md:grid md:grid-cols-3 gap-3">
                          {renderCard(main, 'md:row-span-2', 560)}
                          {renderCard(b, '', 230, 0.1)}
                          {renderCard(c, '', 230, 0.15)}
                          {renderCard(wide, 'md:col-span-2', 360, 0.2)}
                          {renderCard(e5, '', 280, 0.25)}
                          {renderCard(e6, '', 280, 0.3)}
                          {renderCard(e7, '', 280, 0.35)}
                        </div>
                      </>
                    );
                  })()}
                </div>

                </div>{/* chiude gallery full-width */}

              {/* ── SEZIONE 3: TRE PASSI — full width dark ── */}
              <section id="how-it-works" className="w-full py-10 md:py-14 bg-heritage-ink mt-10 md:mt-20" style={{ scrollMarginTop: '120px' }}>
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                  <ScrollReveal><div className="flex items-center gap-3 mb-6"><span className="w-4 h-px bg-heritage-gold" /><span className="text-heritage-gold text-lg">✦</span><span className="w-4 h-px bg-heritage-gold" /></div><span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Come funziona</span>
                  <h2 className="text-4xl md:text-5xl text-white leading-tight mb-2"><span className="font-serif italic">Semplice, umano.</span><br /><span className="font-serif italic text-heritage-gold">Da casa </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">a casa.</span></h2>
                  </ScrollReveal><div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
                    {[
                      { n: '01', t: 'Sfoglia', b: 'Esplora il catalogo, trova quello che ti colpisce. Ogni oggetto ha un nome, una stanza, una storia. Alcuni sono su Catawiki.' },
                      { n: '02', t: 'Scrivici', b: 'Un messaggio WhatsApp basta — siamo persone, non un negozio. Ci accordiamo insieme su tutto.' },
                      { n: "03", t: "Porta a casa", b: "Ritiro a Cinisello Balsamo o spedizione concordata. L'oggetto riparte. Il ricordo resta." },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col gap-4">
                        <div className="font-serif text-[72px] text-heritage-gold opacity-60 leading-none">{s.n}</div>
                        <div className="w-7 h-px bg-heritage-gold opacity-60" />
                        <p className="text-[14px] tracking-[0.25em] uppercase font-bold text-white">{s.t}</p>
                        <p className="text-[17px] leading-loose text-white/70 italic font-heritage">{s.b}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center md:justify-start">
                    <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] text-white rounded-full text-[12px] font-bold tracking-[0.2em] uppercase">
                      <WhatsAppIcon size={15} color="#fff" /> Scrivici su WhatsApp
                    </a>
                  </div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-4 md:px-6">{/* riapre max-w-7xl dopo Come funziona */}

                {/* ── SEZIONE 4: LA NOSTRA STORIA ── */}
                <section className="mt-10 md:mt-20 pt-8 md:pt-12 border-t border-heritage-ink/8">
                  <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">La nostra storia</span>
                  <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">La casa della</span><br /><span className="font-serif italic text-heritage-gold">famiglia </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">Manescalchi/Giorgi</span></h2>
                  <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-start">
                    <div className="md:col-span-3 flex flex-col gap-8">
                      {[
                        { k: 'La casa', v: 'Ci sono case che sono più di quattro mura. Quella di Barberino di Mugello è cresciuta per oltre 160 anni, pezzo dopo pezzo, stagione dopo stagione. Ogni stanza aveva il suo carattere, ogni angolo il suo odore.' },
                        { k: 'Franco', v: 'Franco Manescalchi ci teneva a quella casa come a un essere vivente. Ogni mobile, ogni lampadario, ogni specchio era arrivato lì con una ragione — e ci era rimasto perché aveva trovato il suo posto.' },
                        { k: 'La scelta', v: 'Così hanno deciso: non vendere, ma affidare. Trovare persone che amino questi oggetti come li amava papà. Perché i ricordi non finiscono — continuano in chi li accoglie.' },
                      ].map((item, i) => (
                        <div key={i}>
                          <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-heritage-gold mb-3">{item.k}</p>
                          <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage">{item.v}</p>
                          {i < 2 && <div className="w-px h-6 bg-heritage-gold/20 mt-8" />}
                        </div>
                      ))}
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-4">
                      <div className="bg-heritage-ink rounded-2xl px-8 py-10 text-center">
                        <div className="font-serif text-[68px] text-heritage-gold leading-none italic mb-2">160+</div>
                        <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-white/50">anni di storia</p>
                      </div>
                      <div className="bg-white rounded-2xl p-7 border border-heritage-ink/8">
                        <p className="font-serif text-[16px] leading-relaxed text-heritage-ink italic opacity-90 mb-4">"I ricordi che portano con sé non finiscono con noi. Sono per sempre."</p>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold">Aleria, Olivia ed Emanuela</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 5: LE VOCI DI CASA ── */}
                <section className="mt-10 md:mt-20 -mx-4 md:-mx-6 px-4 md:px-6 py-10 md:py-16 bg-heritage-cream/60">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-end justify-between mb-4">
                      <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold">I ricordi di famiglia</span>
                      {visibleMemories.length > 0 && (
                        <button onClick={() => { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); }} className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-heritage-ink text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                          <BookHeart size={11} className="text-heritage-gold" /> Sfoglia
                        </button>
                      )}
                    </div>
                    <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Le voci </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">di casa</span></h2>
                    <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                    {/* Grid 3 colonne — card grande a sx su 2 righe */}
                    {visibleMemories.length === 0 ? (
                      <div className="text-center py-12 text-heritage-ink/30 italic font-heritage col-span-3">
                        {isSyncing ? 'Caricamento ricordi...' : 'Nessun ricordo ancora.'}
                      </div>
                    ) : (<>
                    <div className="hidden md:grid gap-4" style={{gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto'}}>
                      {shuffledMemories[0] && (() => { const mem = shuffledMemories[0]; const photo = mem.imageUrl || null; const ini = mem.author.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase(); return (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col" style={{gridColumn: '1', gridRow: '1 / 3'}}>
                          {photo && <div className="overflow-hidden" style={{height: '240px'}}><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="bg-heritage-cream/60 flex items-end px-6 pb-0" style={{height:'60px'}}><span className="font-serif text-5xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-6 flex flex-col flex-1 gap-4">
                            <p className="text-lg leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-4 mt-auto">
                              <div className="w-7 h-7 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[11px] font-bold flex-shrink-0">{ini}</div>
                              <div><p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[10px] tracking-widest uppercase text-heritage-gold font-bold mt-0.5">{mem.date}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })()}
                      {shuffledMemories.slice(1, 5).map((mem: FamilyMemory, i: number) => { const photo = mem.imageUrl || null; const ini = mem.author.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase(); return (
                        <motion.div key={mem.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                          {photo && <div className="overflow-hidden" style={{height: '120px'}}><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="bg-heritage-cream/60 flex items-end px-5 pb-0" style={{height:'40px'}}><span className="font-serif text-4xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-5 flex flex-col flex-1 gap-3">
                            <p className="text-[15px] leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-2 border-t border-heritage-ink/8 pt-3 mt-auto">
                              <div className="w-6 h-6 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[10px] font-bold flex-shrink-0">{ini}</div>
                              <div><p className="text-[12px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[9px] tracking-widest uppercase text-heritage-gold font-bold">{mem.date}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })}
                    </div>
                    {/* Mobile: 3 card verticali */}
                    <div className="md:hidden flex flex-col gap-4">
                      {shuffledMemories.slice(0, 3).map((mem: FamilyMemory, i: number) => { const photo = mem.imageUrl || null; const ini = mem.author.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase(); return (
                        <motion.div key={mem.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                          {photo && <div className="h-48 overflow-hidden"><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="h-10 bg-heritage-cream/60 flex items-end px-5 pb-0"><span className="font-serif text-4xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-5 flex flex-col gap-3">
                            <p className="text-base leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-3">
                              <div className="w-7 h-7 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[11px] font-bold flex-shrink-0">{ini}</div>
                              <div><p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[10px] tracking-widest uppercase text-heritage-gold font-bold mt-0.5">{mem.date}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })}
                    </div>
                    </>)}
                    {/* Link vedi tutti */}
                    <div className="flex justify-center mt-10">
                      <button onClick={() => { if (window.innerWidth < 1024) { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); } else { setLoaderIndex(0); setLoaderFromMenu(true); setDismissed(false); setShowLoaderCover(true); history.pushState({ loaderOpen: true }, ""); } }} className="group flex items-center gap-3 px-8 py-4 bg-heritage-ink text-heritage-cream rounded-full text-[12px] font-bold uppercase tracking-widest hover:bg-heritage-olive transition-all shadow-lg">
                        Leggi tutti i ricordi <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </section>

              </div>{/* chiude max-w-7xl per Contatti full-width */}

              {/* ── SEZIONE 6: CONTATTI — full width cream ── */}
              <section className="w-full mt-12 md:mt-16 py-12 md:py-16 bg-[#EDE4D0]">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
                    <div>
                      <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Contatti</span>
                      <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Hai visto qualcosa</span><br /><span className="font-serif italic text-heritage-gold">che ti </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">parla?</span></h2>
                      <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-8" />
                      <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage mb-8">Non sei sicuro, vuoi vedere un oggetto dal vivo, o vuoi seguire un'asta su Catawiki? Ogni messaggio è il benvenuto. Rispondiamo entro poche ore.</p>
                      <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] text-white rounded-full text-[12px] font-bold tracking-[0.2em] uppercase">
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
                            <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-heritage-gold mb-1">{row.label}</p>
                            <p className={`text-[15px] font-bold ${row.dark ? 'text-white' : 'text-heritage-ink'}`}>{row.title}</p>
                            <p className={`text-[14px] mt-0.5 ${row.dark ? 'text-white/60' : 'text-heritage-ink/65'}`}>{row.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

            </motion.div>
          )}

          {/* ── CATALOG ── */}
          {view === 'catalog' && (
            <motion.div key="catalog" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="max-w-7xl mx-auto px-4 md:px-6 pt-[180px] md:pt-[300px] pb-12">

              {/* Mobile title - in flow */}
              <div className="md:hidden mb-8">
                <h2 className="text-3xl font-serif italic text-heritage-ink leading-tight mb-2">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                <p className="text-heritage-ink/80 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
              </div>

              {/* Fixed block desktop: copre dall'alto fino alla filter bar */}
              {/* Desktop: blocco fisso con titolo + ricerca in alto, categorie sotto */}
              <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-heritage-cream shadow-[0_8px_32px_0_rgba(30,25,20,0.08)]">
                <div className="max-w-7xl mx-auto px-6">
                  {/* Riga titolo + ricerca + stato */}
                  <div className="pt-[156px] pb-3 flex items-end justify-between gap-8">
                    <div>
                      <h2 className="text-3xl md:text-5xl font-serif italic text-heritage-ink leading-tight mb-1">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                      <p className="text-heritage-ink/60 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
                    </div>
                    <div className="flex items-center gap-3 pb-1">
                      {/* Ricerca */}
                      <div className="relative">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca oggetto..." className="w-48 focus:w-64 transition-all duration-300 bg-white border border-heritage-ink/12 rounded-full px-4 py-2 text-[13px] focus:outline-none focus:border-heritage-gold placeholder-heritage-ink/30" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-heritage-ink/30 hover:text-heritage-ink"><X size={13} /></button>}
                      </div>
                      {/* Stato */}
                      <div className="flex items-center gap-1.5">
                        {statusFilters.map(s => <button key={s} onClick={() => { setSelectedStatus(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-3 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white/50 text-heritage-ink/50 hover:text-heritage-ink'}`}>{s}</button>)}
                      </div>
                      {isAdmin && <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`p-2 rounded-full transition-all border ${showFavoritesOnly ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white/50 border-heritage-ink/5 text-heritage-ink/50'}`}><Heart size={15} fill={showFavoritesOnly ? 'currentColor' : 'none'} /></button>}
                    </div>
                  </div>
                  {/* Riga categorie */}
                  <div className="flex items-center gap-1.5 pb-3 border-t border-heritage-ink/6 pt-2.5">
                    {categoriesWithCount.map(cat => (
                      <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setSelectedRoomFilter(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-heritage-olive text-white' : 'text-heritage-ink/50 hover:text-heritage-ink'}`}>
                        <span>{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-white/20 text-white' : 'bg-heritage-ink/8 text-heritage-ink/50'}`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile: blocco cream pieno che copre da top-0 a top-96px */}
              <div className="md:hidden fixed top-0 left-0 right-0 z-[49] bg-heritage-cream" style={{ height: '96px' }} />

              <div className="fixed top-[96px] md:top-[280px] left-0 right-0 z-40 bg-heritage-cream border-b border-heritage-ink/10 px-4 md:hidden py-3 shadow-[0_4px_16px_0_rgba(30,25,20,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex md:hidden w-full items-center justify-between px-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-widest font-bold text-heritage-gold mb-0.5">Filtri Attivi</span>
                      <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink italic truncate max-w-[200px]">
                        {selectedRoomFilter ? `Stanza · ${selectedCategory !== 'Tutti' ? selectedCategory : 'Tutti'}` : selectedCategory}
                        {selectedStatus !== 'Tutti' ? ` · ${selectedStatus}` : ''}
                      </span>
                    </div>
                    <button onClick={() => setIsMobileFilterOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-heritage-ink text-white rounded-full text-[12px] font-bold uppercase tracking-widest"><SlidersHorizontal size={14} /> Filtra</button>
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
                            <button onClick={() => { setSelectedCategory('Tutti'); setSelectedStatus('Tutti'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[12px] uppercase font-bold tracking-widest text-heritage-gold">Reset</button>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-heritage-ink/5 rounded-full text-heritage-ink/65"><X size={24} /></button>
                          </div>
                        </div>
                        <div>
                          <div className="relative mb-4">
                          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca oggetto..." className="w-full bg-heritage-cream/40 border border-heritage-ink/12 rounded-2xl px-5 py-3 text-[15px] focus:outline-none focus:border-heritage-gold placeholder-heritage-ink/30" />
                          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-heritage-ink/40"><X size={16} /></button>}
                        </div>
                        <h4 className="text-[12px] uppercase font-bold tracking-widest text-heritage-ink/65 mb-4">Categorie</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoriesWithCount.map(cat => <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setSelectedRoomFilter(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-4 py-3 rounded-xl text-[12px] uppercase tracking-widest font-bold transition-all text-left flex justify-between items-center ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-heritage-olive text-white' : 'bg-white text-heritage-ink/65 border border-heritage-ink/5'}`}><span>{cat.name}</span><span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20' : 'bg-heritage-ink/5 text-heritage-ink/20'}`}>{cat.count}</span></button>)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[12px] uppercase font-bold tracking-widest text-heritage-ink/65 mb-4">Stato</h4>
                          <div className="flex flex-wrap gap-2">
                            {statusFilters.map(s => <button key={s} onClick={() => { setSelectedStatus(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-4 py-2 rounded-full text-[12px] uppercase tracking-widest font-bold ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white border border-heritage-ink/10 text-heritage-ink/65'}`}>{s}</button>)}
                          </div>
                        </div>
                        {isAdmin && favorites.length > 0 && (
                          <button onClick={() => { setShowFavoritesOnly(p => !p); setIsMobileFilterOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-bold text-[13px] uppercase tracking-[0.15em] transition-all ${showFavoritesOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                            <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                            I miei preferiti · {favorites.length}
                          </button>
                        )}
                        <button onClick={() => setIsMobileFilterOpen(false)} className="w-full flex items-center justify-center py-4 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-[0.2em] hover:bg-heritage-ink/90 transition-colors">Mostra Risultati</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="hidden md:block h-20" />
              {/* Risultati */}
              <div className="flex flex-wrap gap-4 md:gap-8">
                {filteredItems.slice(0, visibleCount).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index % 12, 11) * 0.055, ease: [0.22, 1, 0.36, 1] }}
                    className={`${(item.catawikiUrl || (item as any).isImportant || item.isFeatured) ? 'basis-full md:flex-grow md:basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]' : 'flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]'}`}>
                    <ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onToggleFeatured={isAdmin ? toggleFeatured : undefined} onClick={() => openItem(item)} isAdmin={isAdmin} showFeaturedBadge isHighlight={!!(item.catawikiUrl || item.isFeatured || (item as any).isImportant)} />
                  </motion.div>
                ))}
                {filteredItems.length === 0 && !isSyncing && (
                  <div className="w-full py-20 text-center border border-dashed border-heritage-ink/10 rounded-2xl">
                    {searchQuery ? (
                      <div className="space-y-3">
                        <p className="text-heritage-ink/65 italic font-serif text-lg">Nessun risultato per "{searchQuery}"</p>
                        <button onClick={() => setSearchQuery('')} className="text-heritage-gold text-[12px] font-bold uppercase tracking-widest hover:underline">Cancella ricerca</button>
                      </div>
                    ) : (
                      <p className="text-heritage-ink/65 italic font-serif">Nessun oggetto trovato.</p>
                    )}
                  </div>
                )}
              </div>
              {/* Infinite scroll trigger */}
              {visibleCount < filteredItems.length && (
                <div ref={loaderRef} className="w-full flex justify-center py-10">
                  <div className="flex items-center gap-3 text-heritage-ink/40">
                    <div className="w-4 h-4 border-2 border-heritage-ink/20 border-t-heritage-gold rounded-full animate-spin" />
                    <span className="text-[12px] uppercase tracking-widest font-bold">Carico altri...</span>
                  </div>
                </div>
              )}
              {visibleCount >= filteredItems.length && filteredItems.length > 12 && (
                <p className="text-center text-[11px] uppercase tracking-widest font-bold text-heritage-ink/25 py-8">
                  {filteredItems.length} oggetti · fine catalogo
                </p>
              )}
            </motion.div>
          )}

          {/* ── DETAIL ── */}
          {view === 'item-detail' && currentItem && (
            <motion.div key={currentItem.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="pb-32 md:pb-12 bg-heritage-cream">

              {/* ── MOBILE HERO — foto + overlay con titolo e prezzo ── */}
              <div className="md:hidden relative" style={{marginTop: '-1px'}}>
                {/* Foto hero */}
                <div
                  className="relative overflow-hidden bg-heritage-ink/10 cursor-zoom-in"
                  style={{aspectRatio: "4/5", maxHeight: "70vh"}}
                  onClick={() => {
                    const imgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                    setLightboxImages(imgs);
                    setLightboxIndex(0);
                    setIsLightboxOpen(true);
                  }}
                >
                  {currentItem.imageUrl && <motion.img initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} src={currentItem.imageUrl} alt={currentItem.name} className="w-full h-full object-cover" />}
                  {!currentItem.imageUrl && <div className="w-full h-full flex items-center justify-center"><Camera size={48} className="text-heritage-ink/20" /></div>}

                  {/* Gradiente dal basso */}
                  <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/80 via-heritage-ink/20 to-transparent" />
                  {/* Hint lightbox — lente in alto a dx */}
                  <div className="absolute right-4 w-12 h-12 flex items-center justify-center rounded-full pointer-events-none" style={{top: "100px", background: "rgba(0,0,0,0.12)", filter: "saturate(0)"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                  </div>



                  {/* Bottom overlay: categoria + titolo + prezzo + badge */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                    {/* Categoria */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-px bg-heritage-gold" />
                      <span className="text-heritage-gold text-[10px] uppercase tracking-[0.25em] font-bold">{currentItem.category}</span>
                    </div>
                    {/* Titolo — serif + sans serif */}
                    <h2 className="text-white leading-tight mb-3" style={{fontSize: '32px'}}>
                      <span className="font-serif italic">{currentItem.name.split(' ')[0]} </span>
                      <span className="font-display font-bold not-italic tracking-tight text-white">{currentItem.name.split(' ').slice(1).join(' ')}</span>
                    </h2>
                    {/* Prezzo + badge */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-0.5">Prezzo</p>
                        {currentItem.catawikiUrl ? (
                          <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-[#7B1818]/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            Catawiki <ExternalLink size={10} />
                          </a>
                        ) : isAdozione(currentItem) ? (
                          <p className="text-white/70 font-serif italic text-xl">{getAdozioneLabel(currentItem)}</p>
                        ) : (
                          <>
                            <p className="text-heritage-gold font-serif italic text-2xl">{(currentItem as any).displayPrice || 'Su richiesta'}</p>
                            {isAdmin && (currentItem as any).displayPrice && (currentItem.price || currentItem.estimatedValue) && (
                              <p className="text-white/40 text-[10px] mt-0.5">rif. {currentItem.price || currentItem.estimatedValue}</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(currentItem.images?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                            <ImageIcon size={11} className="text-white/80" />
                            <span className="text-white/80 text-[11px] font-bold">{1 + (currentItem.images?.length ?? 0)}</span>
                          </div>
                        )}
                        {(() => { const b = getPublicBadge(currentItem.status, (currentItem as any).acquisitionType); return (b.label === 'Disponibile' || b.label === 'In adozione') ? <span className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-full"><span className="relative flex w-1.5 h-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" /></span><span className="text-white/80 text-[9px] font-bold uppercase tracking-wider">{b.label}</span></span> : <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full ${b.cls}`}>{b.label}</span>; })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strip miniature foto */}
                {(() => {
                  const allImgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                  return allImgs.length > 1 ? (
                    <div className="flex gap-2 px-4 py-3 bg-[#EDE4D0] border-b border-heritage-ink/8 overflow-x-auto" style={{scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', flexWrap: 'nowrap', touchAction: 'pan-x'}}>
                      {allImgs.map((img, i) => (
                        <button key={i} onClick={() => { setLightboxImages(allImgs); setLightboxIndex(i); setIsLightboxOpen(true); }}
                          style={{touchAction: 'manipulation'}}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === 0 ? 'border-heritage-gold' : 'border-transparent'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 md:pt-48 bg-heritage-cream">

              {/* Desktop: back + prev/next */}
              <div className="hidden md:flex items-center justify-between mb-8">
                <button onClick={() => handleBackToCatalog()} className="flex items-center gap-2 text-heritage-ink/80 hover:text-heritage-ink group transition-colors"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="font-heritage">Ritorna alla Collezione</span></button>
                <div className="flex items-center gap-2">
                  {prevItem && <button onClick={() => openItem(prevItem)} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-heritage-ink/5 hover:bg-heritage-ink/10 rounded-full text-sm font-bold uppercase tracking-widest text-heritage-ink/60 transition-all"><ChevronLeft size={16} /><span>{prevItem.name.split(' ').slice(0,2).join(' ')}</span></button>}
                  {nextItem && <button onClick={() => openItem(nextItem)} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-heritage-ink/5 hover:bg-heritage-ink/10 rounded-full text-sm font-bold uppercase tracking-widest text-heritage-ink/60 transition-all"><span>{nextItem.name.split(' ').slice(0,2).join(' ')}</span><ChevronRight size={16} /></button>}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-16">
                {/* Desktop gallery */}
                <div className="hidden md:block space-y-8">
                  <ImageGallery
                    images={[currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[]}
                    name={currentItem.name}
                    status={currentItem.status}
                    acquisitionType={(currentItem as any).acquisitionType}
                    catawikiUrl={currentItem.catawikiUrl}
                    onOpenLightbox={(i) => {
                      const imgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                      setLightboxImages(imgs);
                      setLightboxIndex(i);
                      setIsLightboxOpen(true);
                    }}
                  />
                </div>

                <div className="flex flex-col">
                  <div className="flex-1">

                    {/* Desktop: categoria + titolo */}
                    <div className="hidden md:block">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-heritage-gold uppercase tracking-[0.3em] text-[12px] font-bold"><span className="w-8 h-[1px] bg-heritage-gold" />{currentItem.category}</div>
                        {isAdmin && <button onClick={e => toggleFavorite(currentItem.id, e)} className={`p-2.5 rounded-full transition-all border ${currentItem.isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-heritage-ink/5 border-heritage-ink/10 text-heritage-ink/65'}`}><Heart size={18} fill={currentItem.isFavorite ? 'currentColor' : 'none'} /></button>}
                      </div>
                      <h2 className="text-5xl md:text-6xl lg:text-6xl font-serif italic text-heritage-ink leading-[1.02] mb-8">
                        <span className="font-serif italic">{currentItem.name.split(' ')[0]} </span>
                        <span className="text-emerald-950 not-italic font-display font-bold tracking-tight">{currentItem.name.split(' ').slice(1).join(' ')}</span>
                      </h2>
                    </div>

                    {/* Admin tools — entrambe le viste */}
                    {isAdmin && (
                      <div className="flex gap-2 mb-5 flex-wrap">
                        <button onClick={() => { setEditingItem(currentItem); setIsItemModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-heritage-ink/8 text-heritage-ink rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-heritage-ink/15 transition-colors border border-heritage-ink/10"><Edit size={12} />Modifica</button>
                        <button onClick={() => setItemToDelete(currentItem.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-400 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-red-100 border border-red-100"><Trash2 size={12} />Elimina</button>
                        <button
                          onClick={() => handlePrepareCatawiki(currentItem)}
                          disabled={isPreparingCatawiki}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-all ${isPreparingCatawiki ? 'bg-[#7B1818]/10 text-[#7B1818]/50 border-[#7B1818]/20 cursor-wait' : currentItem.catawikiTitle ? 'bg-[#7B1818]/10 text-[#7B1818] border-[#7B1818]/30 hover:bg-[#7B1818]/20' : 'bg-[#7B1818] text-white border-[#7B1818] hover:bg-[#5a1212]'}`}
                        >
                          {isPreparingCatawiki ? <><div className="w-3 h-3 border-2 border-[#7B1818]/50 border-t-transparent rounded-full animate-spin" />Elaborazione...</> : <>{currentItem.catawikiTitle ? '✓ Scheda Catawiki' : 'Prepara per Catawiki'}</>}
                        </button>
                        {currentItem.catawikiTitle && (
                          <button onClick={() => exportSingleCatawiki(currentItem)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-green-100 border border-green-200 transition-all">
                            <Upload size={12} />Scarica scheda
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── CARATTERISTICHE — pillole su mobile, DetailBox su desktop ── */}
                    <div className="md:hidden mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-heritage-gold">Caratteristiche</span>
                        <div className="flex-1 h-px bg-heritage-ink/8" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentItem.room && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Stanza</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.room}</span>
                          </div>
                        )}
                        {currentItem.year && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Epoca</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.year}</span>
                          </div>
                        )}
                        {currentItem.dimensions && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Dimensioni</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.dimensions}</span>
                          </div>
                        )}
                        {currentItem.wearCondition && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Condizione</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.wearCondition}</span>
                          </div>
                        )}
                        {currentItem.destination && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Si trova a</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.destination}</span>
                          </div>
                        )}
                        {currentItem.shipping && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Spedizione</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.shipping}</span>
                          </div>
                        )}
                        {currentItem.catawikiUrl ? (
                          <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                            className="flex flex-col bg-[#7B1818] rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-white/60">Asta</span>
                            <span className="text-[13px] font-bold text-white flex items-center gap-1">Catawiki <ExternalLink size={10} /></span>
                          </a>
                        ) : (!isAdozione(currentItem) && (currentItem as any).displayPrice) ? (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Prezzo</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{(currentItem as any).displayPrice}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Desktop: caratteristiche come DetailBox */}
                    <div className="hidden md:block mb-6 border-t border-heritage-ink/10 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                        <div>
                          <DetailBox label="Stanza" value={currentItem.room} />
                          <DetailBox label="Epoca" value={currentItem.year || 'N/D'} />
                          <DetailBox label="Dimensioni" value={currentItem.dimensions || 'N/D'} />
                          {currentItem.wearCondition && <DetailBox label="Condizione" value={currentItem.wearCondition} />}
                        </div>
                        <div>
                          <DetailBox label="Dove si trova" value={currentItem.destination || 'N/D'} />
                          {currentItem.shipping && <DetailBox label="Spedizione" value={currentItem.shipping} />}
                          {currentItem.catawikiUrl ? (
                            <div className="pt-1 pb-1">
                              <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/40 mb-1.5">Prezzo</p>
                              <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-[#7B1818] text-white px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[#5a1212] transition-colors">
                                Vedi su Catawiki <ExternalLink size={10} />
                              </a>
                            </div>
                          ) : (
                            <>
                              {isAdozione(currentItem)
                                ? <DetailBox label="Stato" value={getAdozioneLabel(currentItem) ?? ''} />
                                : <DetailBox label="Prezzo" value={(currentItem as any).displayPrice || 'Su richiesta'} />}
                              {isAdmin && (currentItem as any).displayPrice && (currentItem.price || currentItem.estimatedValue) && (
                                <DetailBox label="Prezzo rif. (admin)" value={currentItem.price || currentItem.estimatedValue || ''} />
                              )}
                            </>
                          )}
                          {currentItem.productCode && <DetailBox label="Codice" value={currentItem.productCode} />}
                        </div>
                      </div>

                    </div>

                    {/* Descrizione */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3 md:hidden">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-heritage-gold">Descrizione</span>
                        <div className="flex-1 h-px bg-heritage-ink/8" />
                      </div>
                      {(() => {
                        const hasCatawiki = !!(currentItem.catawikiTitle || currentItem.catawikiDescription);
                        return hasCatawiki ? (
                          <AntiquarianSection item={currentItem} />
                        ) : (
                          <>
                            <h4 className="hidden md:block font-serif text-xl mb-4 italic">Descrizione e Storia</h4>
                            <p className="text-lg leading-relaxed text-heritage-ink/85 font-light mb-6">{currentItem.description}</p>
                            {currentItem.technicalNotes && (
                              <div className="p-5 bg-white rounded-2xl border border-heritage-ink/8">
                                <h5 className="text-[10px] uppercase tracking-widest font-bold mb-2 text-heritage-gold">Note tecniche</h5>
                                <p className="text-sm italic leading-relaxed text-heritage-ink/80">{currentItem.technicalNotes}</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>



{/* Ricordi rimossi temporaneamente */}
                  </div>

                  {/* CTA desktop */}
                  <div className="hidden md:flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a href={`https://wa.me/393394468130?text=${encodeURIComponent(`Buongiorno, vorrei informazioni su:
${currentItem.name}
${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 px-8 py-5 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all group shadow-xl"><WhatsAppIcon size={18} color="white" /><span className="font-heritage font-medium">Contatta su WhatsApp</span></a>
                      <button onClick={() => { const u = `${window.location.origin}?item=${currentItem.id}`; navigator.share ? navigator.share({ title: currentItem.name, url: u }).catch(() => {}) : (navigator.clipboard.writeText(u), showNotif('Link copiato!')); }} className="flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-heritage-ink/10 text-heritage-ink rounded-full hover:border-heritage-gold hover:text-heritage-gold transition-all group shadow-xl"><Share2 size={18} /><span className="font-heritage font-medium">Condividi</span></button>
                    </div>
                    <div className="flex items-center justify-center gap-6 py-4 border-t border-heritage-ink/5 mt-2">
                      <span className="text-[12px] uppercase tracking-[0.2em] font-bold opacity-60">Condividi su:</span>
                      <div className="flex gap-4">
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${currentItem.name} - ${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/65 hover:text-[#25D366] transition-all hover:scale-110"><WhatsAppIcon size={18} color="currentColor" /></a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/65 hover:text-heritage-gold transition-all hover:scale-110"><Facebook size={18} /></a>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}&text=${encodeURIComponent(currentItem.name)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/65 hover:text-heritage-gold transition-all hover:scale-110"><Twitter size={18} /></a>
                        <a href={`mailto:?subject=${encodeURIComponent(`Heritage: ${currentItem.name}`)}&body=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}`} className="p-2 text-heritage-ink/65 hover:text-heritage-gold transition-all hover:scale-110"><Mail size={18} /></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* ── MOBILE STICKY BAR — crema leggera ── */}
              <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 220, delay: 0.15 }} className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-heritage-cream/95 backdrop-blur-sm border-t border-heritage-ink/8 px-4 pt-2" style={{paddingBottom: "max(10px, env(safe-area-inset-bottom, 8px))"}}>
                {/* Price + WhatsApp row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {currentItem.catawikiUrl ? (
                      <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#7B1818] text-white px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                        Catawiki <ExternalLink size={10} />
                      </a>
                    ) : (
                      <>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink/40 leading-none mb-0.5">Prezzo</p>
                        <p className="text-heritage-ink font-serif italic text-base leading-none truncate">{getAdozioneLabel(currentItem) ?? ((currentItem as any).displayPrice || 'Su richiesta')}</p>
                      </>
                    )}
                  </div>
                  <a href={`https://wa.me/393394468130?text=${encodeURIComponent(`Buongiorno, vorrei informazioni su:
${currentItem.name}
${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#128C7E] hover:bg-[#0e7066] text-white px-5 py-2.5 rounded-full font-bold text-[12px] uppercase tracking-wider flex-shrink-0 transition-colors">
                    <WhatsAppIcon size={14} color="white" /> WhatsApp
                  </a>
                </div>
              </motion.div>

              {relatedItems.length > 0 && (
                <div className="mt-10 pt-8 border-t border-heritage-ink/10">
                  <h3 className="text-3xl md:text-4xl text-heritage-ink leading-tight mb-12"><span className="font-serif italic">Ti potrebbe </span><span className="font-display font-bold not-italic tracking-tight text-emerald-950">interessare</span></h3>
                  <div className="hidden md:block h-20" />
              <div className="flex flex-wrap gap-4 md:gap-8">
                    {relatedItems.map(item => <div key={item.id} className="flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]"><ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onToggleFeatured={isAdmin ? toggleFeatured : undefined} onClick={() => openItem(item)} isAdmin={isAdmin} showFeaturedBadge /></div>)}
                  </div>
                </div>
              )}
              </div>{/* chiude max-w-7xl */}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {window.matchMedia('(min-width: 768px)').matches && (
      <footer className="site-footer bg-heritage-ink text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-heritage-gold rounded-full flex items-center justify-center text-emerald-950 flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/></svg>
                </div>
                <div>
                  <p className="font-serif font-bold text-white leading-none">Barberino2026</p>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-heritage-gold/70 mt-0.5">Archivio di Famiglia</p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-serif italic leading-relaxed">Una casa che cambia, ricordi che restano. Ogni oggetto porta con sé un frammento di storia.</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-heritage-gold mb-5">Esplora</p>
              <ul className="space-y-3">
                <li><button onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">La storia</button></li>
                <li><button onClick={() => { setExplorePanelMode('discover'); setIsExplorePanelOpen(true); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">Il catalogo</button></li>
                <li><button onClick={() => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 400); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">Vendita e adozione</button></li>
                <li><button onClick={() => { setLoaderIndex(Math.floor(Math.random() * Math.max(shuffledMemories.length, 1))); setLoaderFromMenu(true); setDismissed(false); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">I ricordi</button></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-heritage-gold mb-5">Contatti</p>
              <p className="text-white/50 text-sm mb-5 font-serif italic">Scrivici per qualsiasi oggetto — siamo persone, non un negozio.</p>
              <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#128C7E] hover:bg-[#0e7066] text-white rounded-full text-[12px] font-bold uppercase tracking-wider transition-all">
                <WhatsAppIcon size={15} color="white" /> WhatsApp
              </a>
            </div>
          </div>
          <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/25 text-[11px] font-serif italic">1 Corso Corsini · Barberino di Mugello · 2026</p>
            <p className="text-white/25 text-[11px]">Custodito per le generazioni future</p>
          </div>
        </div>
      </footer>
      )}

      {/* ── Modals ── */}

      {/* Catawiki Modal */}
      <AnimatePresence>
        {isCatawikiModalOpen && catawikiItem && (
          <Suspense fallback={null}>
          <CatawikiModal
            key={catawikiItem.id}
            item={catawikiItem}
            onClose={() => { setIsCatawikiModalOpen(false); setCatawikiItem(null); }}
            onSave={handleSaveCatawikiData}
          />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={lightboxImages}
            initialIndex={lightboxIndex}
            name={currentItem?.name || ''}
            room={currentItem?.room}
            year={currentItem?.year}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* MemoryModal */}
      <AnimatePresence>
        {isMemoryModalOpen && (
          <Suspense fallback={null}>
          <MemoryModal
            isOpen={isMemoryModalOpen}
            onClose={() => {
              setIsMemoryModalOpen(false);
              const saved = sessionStorage.getItem('b2026_scroll');
              if (saved) setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }), 0);
            }}
            editingMemory={editingMemory}
            memories={memories}
            items={items}
            onSave={(updated) => { setMemories(updated); try { localStorage.setItem('b2026_memories', JSON.stringify(updated.filter(m => m.visibility !== 'private'))); } catch {} setIsMemoryModalOpen(false); const saved = sessionStorage.getItem('b2026_scroll'); if (saved) setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }), 0); }}
            onPinSave={(updated) => { setMemories(updated); try { localStorage.setItem('b2026_memories', JSON.stringify(updated.filter(m => m.visibility !== 'private'))); } catch {} }}
            onNotify={showNotif}
            sessionUser={sessionUser}
            canEditAll={perms.canEditAllMemories}
          />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ExplorePanel */}
      <ExplorePanel
        isOpen={isExplorePanelOpen}
        onClose={() => setIsExplorePanelOpen(false)}
        totalItems={mergedItems.length}
        categoriesWithCount={categoriesWithCount}
        onExplore={handleExploreConfirm}
        mode={explorePanelMode}
        isAdmin={isAdmin}
        favorites={favorites}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => { setShowFavoritesOnly(p => !p); handleBackToCatalog('catalog'); }}
      />

      {/* Gestione utenti e cambio password */}
      {isUsersAdminOpen && <Suspense fallback={null}><UsersAdminModal isOpen={isUsersAdminOpen} onClose={() => setIsUsersAdminOpen(false)} currentUsername={currentUser || ''} onNotify={showNotif} /></Suspense>}
      {isChangePwOpen && <Suspense fallback={null}><ChangePasswordModal isOpen={isChangePwOpen} onClose={() => setIsChangePwOpen(false)} forced={!!sessionUser?.mustChangePassword} onDone={u => setSessionUser(u)} onNotify={showNotif} /></Suspense>}

      {/* Login */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={() => setIsLoginModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between">
                <div><h3 className="text-xl font-serif">Accesso Famiglia</h3><p className="text-[12px] uppercase tracking-widest text-heritage-ink/65 font-bold mt-1">Operatori autorizzati</p></div>
                <button onClick={() => setIsLoginModalOpen(false)} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
              </div>
              <LoginForm onLogin={handleLogin} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Form */}
      {isItemModalOpen && <Suspense fallback={null}><ItemModal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} onSave={handleSaveItem} initialData={editingItem} onDelete={id => setItemToDelete(id)} nextOrder={items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 1} /></Suspense>}

      {/* Hero modal */}
      <HeroImageModal isOpen={isHeroModalOpen} onClose={() => setIsHeroModalOpen(false)} initialUrl={heroImageUrl} onSave={async picked => {
              setIsHeroModalOpen(false);
              let url = picked;
              if (url.startsWith('data:')) {
                const uploaded = await uploadImage(url, `hero-${Date.now()}.jpg`);
                if (!uploaded) { showNotif('Caricamento della foto non riuscito', 'error'); return; }
                url = uploaded;
              }
              setHeroImageUrl(url);
              try { localStorage.setItem('b2026_hero', url); } catch {}
              const r = await saveSettingsRemote({ heroImageUrl: url });
              showNotif(r.ok ? 'Sfondo aggiornato su tutti i dispositivi ✓' : r.error, r.ok ? 'success' : 'error');
            }} />

      {/* Delete confirm */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-heritage-ink/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setItemToDelete(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
              <h3 className="text-2xl font-serif mb-2">Sei sicuro?</h3>
              <p className="text-heritage-ink/80 mb-8 text-sm leading-relaxed">Questa operazione eliminerà definitivamente l'oggetto. Potrai recuperarlo solo dal file items.json.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setItemToDelete(null)} className="px-6 py-3 rounded-xl border border-heritage-ink/10 text-sm font-bold uppercase tracking-widest hover:bg-heritage-cream">Annulla</button>
                <button onClick={() => handleDeleteItem(itemToDelete)} className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg">Elimina</button>
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

      {/* FAB mobile — solo admin, solo mobile */}
      <AnimatePresence>
        {isAdmin && !isItemModalOpen && !isMemoryModalOpen && view !== 'item-detail' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="sm:hidden fixed right-6 bottom-6 z-[150] flex flex-col items-end gap-2"
          >
            <AnimatePresence>
              {showNuovoDropdown && (
                <>
                  <motion.button
                    initial={{ scale: 0, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0, y: 10 }}
                    transition={{ delay: 0.05 }} whileTap={{ scale: 0.92 }}
                    onClick={() => { sessionStorage.setItem('b2026_scroll', String(window.scrollY)); setEditingMemory(null); setIsMemoryModalOpen(true); setShowNuovoDropdown(false); }}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-950 text-white rounded-full text-[12px] font-bold shadow-lg border border-white/20"
                  >
                    <BookHeart size={16} className="text-heritage-gold" /> Ricordo
                  </motion.button>
                  <motion.button
                    initial={{ scale: 0, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0, y: 10 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setShowNuovoDropdown(false); }}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-950 text-white rounded-full text-[12px] font-bold shadow-lg border border-white/20"
                  >
                    <Archive size={16} className="text-heritage-gold" /> Oggetto
                  </motion.button>
                </>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowNuovoDropdown((v: boolean) => !v)}
              className={`w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20 transition-colors ${showNuovoDropdown ? 'bg-heritage-ink' : 'bg-heritage-gold'}`}
            >
              <Plus size={28} className={`transition-transform duration-200 ${showNuovoDropdown ? 'rotate-45' : ''}`} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
