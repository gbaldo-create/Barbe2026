import { HeritageItem } from '../types.ts';
import { api } from '../api';
import { CATAWIKI_CATEGORIES, CATAWIKI_COUNTRIES, CATAWIKI_STYLES, emptyForm } from './shared';

// ─── Claude vision analysis ───────────────────────────────────────────────────

export async function analyzeImageWithClaude(
  mainImageBase64: string,
  detailImages?: { base64: string; tipo: string }[]
): Promise<Partial<typeof emptyForm> | null> {

  const toB64 = (b: string) => b.includes(',') ? b.split(',')[1] : b;
  const toMime = (b: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' =>
    b.startsWith('data:image/png') ? 'image/png' : b.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';

  const mainB64 = toB64(mainImageBase64);
  if (!mainB64 || mainB64.length < 100) { console.error('Base64 vuoto o invalido'); return null; }

  const callApi = async (messages: any[]): Promise<any> => {
    const tryModel = async (model: string) => {
      const res = await api.ai({ model, max_tokens: 1000, messages });
      if (res.status === 529 || res.status === 503) return null;
      if (!res.ok) { const e = await res.json().catch(() => ({})); if ((e.error?.message || '').includes('overloaded')) return null; throw new Error(e.error?.message || `Errore ${res.status}`); }
      return res.json();
    };
    const data = await tryModel('claude-sonnet-4-6') ?? await tryModel('claude-haiku-4-5-20251001');
    if (!data) throw new Error('Server AI sovraccarico — riprova tra qualche minuto');
    return data;
  };

  // ── STEP 1: analisi dedicata marchi/firme sulle foto di dettaglio ─────────
  let marksContext = '';

  // Converti URL → base64 (funziona anche con GitHub raw via proxy immagine)
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      // Prova diretta prima
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('not ok');
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      try {
        // Fallback: carica via img tag e disegna su canvas
        return await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = () => resolve('');
          img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        });
      } catch { return ''; }
    }
  };

  const resolvedDetails: { base64: string; tipo: string }[] = [];
  for (const d of (detailImages || [])) {
    if (d.base64.startsWith('http')) {
      const b64 = await urlToBase64(d.base64);
      if (b64 && toB64(b64).length > 100) resolvedDetails.push({ base64: b64, tipo: d.tipo });
    } else if (toB64(d.base64).length > 100) {
      resolvedDetails.push(d);
    }
  }

  const validDetails = resolvedDetails;

  if (validDetails.length > 0) {
    const marksContent: any[] = [];
    validDetails.forEach(({ base64, tipo }) => {
      marksContent.push({ type: 'text', text: `Foto di dettaglio — "${tipo}":` });
      marksContent.push({ type: 'image', source: { type: 'base64', media_type: toMime(base64), data: toB64(base64) } });
    });
    marksContent.push({ type: 'text', text: `Sei un esperto di marchi, firme e punzoni su oggetti d'antiquariato e design industriale.
Esamina ogni immagine ricevuta con la massima attenzione.
Per ogni testo o simbolo visibile:
- Trascrivilo lettera per lettera esattamente come appare (anche se rovesciato o curvo)
- Usa [?] per caratteri incerti
- Descrivi posizione, tecnica (stampato / inciso / applicato / a rilievo) e materiale del supporto
- Se riconosci il marchio, cita produttore, paese e periodo con grado di certezza
- Se non riesci a leggere, descrivi forma e stile grafico

Rispondi in testo libero, in italiano, in modo preciso e conciso.` });

    try {
      const marksData = await callApi([{ role: 'user', content: marksContent }]);
      marksContext = marksData?.content?.[0]?.text || '';
    } catch { /* continua senza */ }
  }

  // ── STEP 2: analisi principale con contesto marchi già risolti ───────────
  const content: any[] = [
    { type: 'image', source: { type: 'base64', media_type: toMime(mainImageBase64), data: mainB64 } },
  ];

  // Foto di dettaglio — inserite con istruzioni prioritarie per marchi e firme
  // Inserisci contesto marchi già analizzati nel prompt principale
  const marksSection = marksContext
    ? `

MARCHI E FIRME GIÀ ANALIZZATI (da foto di dettaglio dedicate — usa questi dati come base certa per l'attribuzione):
${marksContext}`
    : '';

  content.push({
    type: 'text',
    text: `Sei un esperto antiquario e storico del design con conoscenza del mercato dell'arte e degli oggetti da collezione dal Seicento al Duemila: dipinti, stampe, libri antichi, mobili, ceramiche, argenteria, vetri, e design industriale italiano e internazionale del XX secolo (Liberty, Déco, Bauhaus, Mid-Century, Space Age, Memphis). Conosci case d'asta (Pandolfini, Christie's, Sotheby's, Wright, Quittenbaum, Catawiki) e produttori di design (Cassina, Kartell, Artemide, Knoll, Vitra, Zanotta, Stilnovo, Bitossi, Venini, Brionvega, Olivetti). Gli oggetti appartengono a una famiglia italiana borghese con viaggi in tutta Italia e in Europa: non fare mai assunzioni geografiche senza evidenza visiva.${marksSection}

CLASSIFICAZIONE OBBLIGATORIA:
• Antiquariato: prodotto prima del 1900, o fino al 1940 se di manifattura nota
• Modernariato: 1940–1980, design o artigianato di qualità
• Oggetto comune: produzione industriale post-1980 senza firma o valore collezionistico
→ Questa classificazione determina canale di vendita e fascia di prezzo. Non sovrastimare.

VOCABOLARIO CONTROLLATO — usa SOLO queste opzioni:

Sottocategorie per categoria:
• Illuminazione: Lampadario | Applique | Plafoniera | Piantana | Lanterna | Abat-jour | Lume da tavolo
• Mobili: Armadio | Credenza | Comò | Cassettiera | Scrittoio | Tavolo | Tavolo da pranzo | Consolle | Specchiera | Libreria | Comodino | Vetrina
• Sedute: Poltrona | Sedia | Divano | Sgabello | Panca | Chaise longue
• Quadri: Olio su tela | Olio su tavola | Acquerello | Tempera | Pastello | Stampa | Litografia | Incisione | Fotografia | Disegno
• Libri: Libro antico | Atlante | Rivista d'epoca | Manoscritto
• Oggetti: Orologio | Vaso | Scultura | Bronzo | Ceramica | Argenteria | Specchio | Candelabro | Posacenere | Strumento musicale | Giocattolo d'epoca

Stili ammessi: Art Déco | Art Nouveau | Barocco | Bauhaus | Biedermeier | Classico | Eclettico | Impero | Liberty | Luigi XV | Luigi XVI | Memphis | Mid-Century Modern | Modernista | Neoclassico | Pop | Rinascimentale | Rococò | Rustico toscano | Space Age | Vittoriano

REGOLE:
- Tutti i campi in italiano tranne catawikiDescriptionEN
- Non lasciare mai year, catawikiStyle, catawikiSubcategory vuoti — usa range plausibile con grado di certezza tra parentesi se incerto: es. "1950–1970 circa (stima visiva)"
- Prezzi sempre come range min–max realistico per vendita tra privati: non usare prezzi da casa d'aste come riferimento
- catawikiTitle: MAX 80 caratteri, conta i caratteri — esempio corretto: "Lampadario Liberty in bronzo e vetro soffiato, inizio XX sec." = 60 car. ✓
- Tono: autorevole e tecnico, come un esperto che parla a un collezionista informato — no aggettivi come "pregiato", "raffinato", "elegante"
- description e catawikiDescription: solo fatti sull'oggetto — no commenti su perizie necessarie, autenticità da verificare o provenienza incerta (queste note vanno solo in technicalNotes), "di grande interesse"

Procedi:
1. Classifica (antiquariato / modernariato / oggetto comune)
2. Materiali con indicatori cronologici: bachelite (1907–1950), compensato (post-1920), fibra di vetro (post-1950), ABS (post-1960), viti Phillips (post-1940)
3. Attribuzione graduata usando i marchi già analizzati come base certa
4. Per design: originale d'epoca / riedizione autorizzata / replica non autorizzata

Restituisci SOLO un oggetto JSON valido (nessun testo prima o dopo):
{
  "name": "nome breve descrittivo in italiano",
  "description": "2-3 frasi: diretta e precisa, fatti prima delle impressioni — no retorica museale, no commenti su perizie o autenticità",
  "category": "una tra: Mobili | Illuminazione | Sedute | Quadri | Porcellane | Tappeti | Giardino | Libri | Oggetti",
  "room": "stanza più probabile in italiano, vuoto se non deducibile",
  "year": "range obbligatorio anche se incerto — es: 1950–1970 circa (stima visiva)",
  "dimensions": "dimensioni stimate se visibili (es: 80×40×90 cm), altrimenti stringa vuota",
  "price": "range prezzo tra privati in euro — es: € 150–250",
  "technicalNotes": "materiali primari · secondari · tecnica · marchi/firme trascritti · stato conservazione · classificazione (antiquariato/modernariato/comune)",
  "wearCondition": "una tra: Ottimo | Buono | Discreto | Da restaurare",
  "catawikiTitle": "MAX 80 caratteri — conta prima di scrivere",
  "catawikiSubcategory": "dal vocabolario controllato sopra",
  "catawikiStyle": "dal vocabolario controllato sopra",
  "catawikiMaterial": "materiale principale specifico (es: Noce massello | ABS cromato | Vetro soffiato Murano)",
  "catawikiCountry": "paese di origine solo se deducibile, altrimenti Italia",
  "catawikiDescription": "IT: 3-5 frasi — cosa è · materiali · periodo · stato · attribuzione. Senza aggettivi da catalogo. MAX 500 car.",
  "catawikiRestored": false
}`
  });

  // Analisi principale — usa callApi già definita sopra (Sonnet + Haiku fallback)
  const data = await callApi([{ role: 'user', content }]);
  const text = data.content?.[0]?.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { return null; }
}

export async function prepareCatawikiWithAI(item: HeritageItem): Promise<Partial<typeof emptyForm> | null> {

  const prompt = `Sei un esperto di aste Catawiki e antiquariato italiano. 
Dati dell'oggetto:
- Nome: ${item.name}
- Descrizione: ${item.description}
- Categoria: ${item.category}
- Anno/Epoca: ${item.year || 'non specificato'}
- Dimensioni: ${item.dimensions || 'non specificate'}
- Condizione: ${item.wearCondition || 'non specificata'}
- Note tecniche: ${item.technicalNotes || 'nessuna'}
- Prezzo stimato: ${item.estimatedValue || item.price || 'non specificato'}

Genera SOLO un JSON valido con questi campi per Catawiki (nessun testo prima o dopo):
{
  "catawikiTitle": "titolo ottimizzato per Catawiki MAX 60 caratteri, descrittivo e attraente",
  "catawikiCategory": "una tra: ${CATAWIKI_CATEGORIES.join(', ')}",
  "catawikiSubcategory": "sottocategoria specifica (es. Comò, Scrivania, Lampadario...)",
  "catawikiStyle": "uno tra: ${CATAWIKI_STYLES.join(', ')}",
  "catawikiMaterial": "materiale principale (es. Noce massello, Mogano, Bronzo dorato...)",
  "catawikiCountry": "uno tra: ${CATAWIKI_COUNTRIES.join(', ')}",
  "catawikiRestored": false,
  "catawikiDescription": "descrizione in italiano formale stile asta, 3-5 frasi, enfatizza qualità, epoca, stato conservazione e unicità. MAX 500 caratteri."
}`;

  const res = await api.ai({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: prompt }] });

  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Errore API'); }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { return null; }
}
