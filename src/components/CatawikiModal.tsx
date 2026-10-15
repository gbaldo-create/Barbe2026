import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, ExternalLink, Sparkles, Upload, Check,
} from 'lucide-react';
import { HeritageItem } from '../types.ts';
import { api } from '../api';

// ─── CatawikiModal helpers (top-level per evitare re-mount su iOS) ─────────────

export function CatawikiCopyBtn({ text, fk, copied, onCopy }: {
  text: string; fk: string; copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <button type="button" onClick={() => onCopy(text, fk)}
      className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${copied === fk ? 'bg-green-100 text-green-600' : 'bg-heritage-ink/8 text-heritage-ink/40 hover:bg-heritage-ink/15'}`}>
      {copied === fk ? '✓' : 'Copia'}
    </button>
  );
}

export function CatawikiToggle({ val, onToggle }: { val: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
      <div className={`w-9 h-5 rounded-full transition-colors relative ${val ? 'bg-[#7B1818]' : 'bg-heritage-ink/15'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-[12px] font-bold text-heritage-ink/60">{val ? 'Sì' : 'No'}</span>
    </div>
  );
}

export function CatawikiField({ label, value, isAi, options, onChange, copied, onCopy, fieldKey }: {
  label: string; value: string; isAi: boolean; options?: string[];
  onChange: (v: string) => void; copied: string | null;
  onCopy: (text: string, key: string) => void; fieldKey: string;
}) {
  const hasOptions = !!options;
  // "Altro" mode: valore non vuoto e non presente nelle opzioni, OPPURE utente ha scelto Altro
  const isCustomValue = hasOptions && value !== '' && !options!.includes(value);
  const [showCustom, setShowCustom] = React.useState(isCustomValue);

  // Sincronizza se il valore cambia dall'esterno (es. AI che compila)
  React.useEffect(() => {
    if (isCustomValue) setShowCustom(true);
  }, [isCustomValue]);

  const selectValue = hasOptions
    ? (options!.includes(value) ? value : (showCustom ? '__altro__' : ''))
    : value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">{label}</p>
          {isAi && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
        </div>
        <CatawikiCopyBtn text={value || '—'} fk={fieldKey} copied={copied} onCopy={onCopy} />
      </div>
      {hasOptions ? (
        <>
          <select
            value={selectValue}
            onChange={e => {
              if (e.target.value === '__altro__') {
                setShowCustom(true);
                onChange('');
              } else {
                setShowCustom(false);
                onChange(e.target.value);
              }
            }}
            className="w-full border-b border-heritage-ink/20 py-2 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink appearance-none"
            style={{ fontSize: '16px' }}>
            <option value="">— seleziona —</option>
            {options!.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="__altro__">Altro (testo libero)</option>
          </select>
          {showCustom && (
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full border-b border-heritage-gold/60 py-2 bg-heritage-gold/5 px-1 focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink rounded"
              style={{ fontSize: '16px' }}
              placeholder="Scrivi qui..."
            />
          )}
        </>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          className="w-full border-b border-heritage-ink/20 py-2 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic"
          style={{ fontSize: '16px' }}
          placeholder="—" />
      )}
    </div>
  );
}

// ─── CatawikiModal ────────────────────────────────────────────────────────────

// Mapping categoria app → categoria Catawiki
export const CAT_MAP: Record<string, string> = {
  'Mobili': 'Mobili', 'Sedute': 'Mobili', 'Illuminazione': 'Illuminazione',
  'Quadri': 'Quadri', 'Libri': 'Libri',
  'Porcellane': 'Oggetti', 'Oggetti': 'Oggetti',
  'Tappeti': 'Arredo', 'Giardino': 'Arredo',
};

export const CATAWIKI_CATS = ['Mobili', 'Illuminazione', 'Quadri', 'Libri', 'Oggetti', 'Arredo'] as const;
export type CatawikiCat = typeof CATAWIKI_CATS[number];

// Campi specifici per categoria
export const CAT_FIELDS: Record<CatawikiCat, { key: string; label: string; type?: string; options?: string[] }[]> = {
  Mobili: [
    { key: 'tipoMobile', label: 'Tipo mobile', options: ['Armadio', 'Cassettone', 'Comò', 'Credenza', 'Divano', 'Letto', 'Libreria', 'Poltrona', 'Scrivania', 'Sedia', 'Specchiera', 'Tavolo', 'Tavolino', 'Toilette', 'Altro'] },
    { key: 'designer', label: 'Designer / Ebanista' },
    { key: 'produttore', label: 'Produttore / Marchio' },
    { key: 'essenzaLegno', label: 'Essenza legno', options: ['Ciliegio', 'Ebano', 'Faggio', 'Frassino', 'Lacca', 'Mogano', 'Noce', 'Olmo', 'Pino', 'Quercia', 'Radica', 'Rovere', 'Teak', 'Altro'] },
    { key: 'materialeStruttura', label: 'Materiale struttura', options: ['Legno massello', 'Legno impiallacciato', 'Legno laccato', 'Metallo', 'Ferro battuto', 'Ottone', 'Misto legno-metallo', 'Altro'] },
    { key: 'materialeRivestimento', label: 'Materiale rivestimento', options: ['Velluto', 'Seta', 'Lino', 'Cotone', 'Pelle', 'Pelle sintetica', 'Damasco', 'Gobelin', 'Nessuno', 'Altro'] },
    { key: 'ferramenta', label: 'Ferramenta', options: ['Ottone', 'Bronzo', 'Ferro', 'Argento', 'Dorata', 'Originale', 'Sostituita', 'Assente'] },
    { key: 'finitura', label: 'Finitura', options: ['Cera', 'Lacca', 'Laccato bianco', 'Laccato nero', 'Noce scuro', 'Patinato', 'Verniciato', 'Naturale', 'Doratura', 'Altro'] },
    { key: 'colore', label: 'Colore', options: ['Beige', 'Bianco', 'Bordeaux', 'Bruno', 'Ciliegio', 'Crema', 'Dorato', 'Grigio', 'Mogano', 'Nero', 'Noce', 'Rosso', 'Verde', 'Altro'] },
    { key: 'stile', label: 'Stile', options: ['Art Déco', 'Art Nouveau', 'Barocco', 'Biedermeier', 'Design italiano', 'Eclettico', 'Impero', 'Liberty', 'Luigi XIV', 'Luigi XV', 'Luigi XVI', 'Modernista', 'Neoclassico', 'Rinascimentale', 'Rococò', 'Rustico toscano', 'Vittoriano', 'Altro'] },
    { key: 'numeroCassetti', label: 'N° cassetti', options: ['0', '1', '2', '3', '4', '5', '6+'] },
    { key: 'numeroAnte', label: 'N° ante', options: ['0', '1', '2', '3', '4+'] },
    { key: 'patinaOriginale', label: 'Patina originale', type: 'bool' },
    { key: 'difettiStrutturali', label: 'Difetti strutturali', options: ['Nessuno', 'Lievi graffi', 'Giunture allentate', 'Parte mancante', 'Crepe nel legno', 'Tarli (trattati)', 'Altro'] },
    { key: 'usuraSuperficie', label: 'Usura superficie', options: ['Nessuna', 'Minima', "Normale per l'età", 'Significativa', 'Da restaurare'] },
  ],
  Illuminazione: [
    { key: 'tipoLampada', label: 'Tipo', options: ['Lampadario', 'Applique', 'Piantana', 'Lampada da tavolo', 'Lanterna', 'Lume', 'Coppia', 'Altro'] },
    { key: 'materialeCorpo', label: 'Materiale corpo', options: ['Ottone', 'Bronzo', 'Ferro battuto', 'Ottone dorato', 'Acciaio', 'Alluminio', 'Legno', 'Ceramica', 'Vetro', 'Misto', 'Altro'] },
    { key: 'materialeDiffusore', label: 'Materiale diffusore', options: ['Cristallo', 'Vetro soffiato', 'Vetro opalino', 'Vetro colorato', 'Vetro molato', 'Tessuto', 'Pergamena', 'Nessuno', 'Altro'] },
    { key: 'numeroPuntiLuce', label: 'N° punti luce', options: ['1', '2', '3', '4', '5', '6', '8', '10', '12', '12+'] },
    { key: 'attacco', label: 'Attacco', options: ['E27', 'E14', 'B22', 'G9', 'G4', 'Da sostituire', 'Altro'] },
    { key: 'funzionante', label: 'Funzionante', type: 'bool' },
    { key: 'cablaggioAggiornato', label: 'Cablaggio aggiornato', type: 'bool' },
    { key: 'colore', label: 'Colore', options: ['Oro', 'Ottone antico', 'Bronzo', 'Nero', 'Bianco', 'Cromo', 'Multicolore', 'Trasparente', 'Altro'] },
    { key: 'stile', label: 'Stile', options: ['Art Déco', 'Art Nouveau', 'Barocco', 'Classico', 'Impero', 'Liberty', 'Modernista', 'Neoclassico', 'Rococò', 'Rustico', 'Vintage', 'Altro'] },
    { key: 'altezzaTotale', label: 'Altezza totale (cm)' },
    { key: 'diametro', label: 'Diametro (cm)' },
  ],
  Quadri: [
    { key: 'titoloOpera', label: 'Titolo opera' },
    { key: 'artista', label: 'Artista / Autore' },
    { key: 'atelierScuola', label: 'Atelier / Scuola', options: ['Scuola fiorentina', 'Scuola toscana', 'Scuola romana', 'Scuola veneziana', 'Scuola napoletana', 'Scuola fiamminga', 'Scuola francese', 'Ignoto', 'Altro'] },
    { key: 'firmato', label: 'Firmato', type: 'bool' },
    { key: 'datato', label: 'Datato', type: 'bool' },
    { key: 'tecnica', label: 'Tecnica', options: ['Olio su tela', 'Olio su tavola', 'Olio su cartone', 'Acrilico', 'Acquerello', 'Tempera', 'Tecnica mista', 'Pastello', 'Matita / Carboncino', 'Stampa', 'Incisione', 'Acquaforte', 'Litografia', 'Serigrafia', 'Altro'] },
    { key: 'supporto', label: 'Supporto', options: ['Tela', 'Tavola', 'Carta', 'Cartone', 'Metallo', 'Rame', 'Avorio', 'Altro'] },
    { key: 'soggetto', label: 'Soggetto', options: ['Paesaggio', 'Ritratto', 'Natura morta', 'Scena di genere', 'Scena storica', 'Scena religiosa', 'Marina', 'Veduta urbana', 'Animali', 'Nudo', 'Astratto', 'Altro'] },
    { key: 'movimentoArtistico', label: 'Movimento artistico', options: ['Barocco', 'Classicismo', 'Divisionismo', 'Espressionismo', 'Impressionismo', 'Liberty', 'Macchiaioli', 'Manierismo', 'Neoclassicismo', 'Realismo', 'Rinascimento', 'Romanticismo', 'Vedutismo', 'Altro'] },
    { key: 'altezzaConCornice', label: 'Altezza con cornice (cm)' },
    { key: 'larghezzaConCornice', label: 'Larghezza con cornice (cm)' },
    { key: 'certificatoAutenticita', label: 'Certificato autenticità', type: 'bool' },
    { key: 'provenienza', label: 'Provenienza / Galleria' },
    { key: 'esposizioni', label: 'Esposizioni / Pubblicazioni' },
    { key: 'restauriTela', label: 'Restauri / Craquelure', options: ['Nessuno', 'Lievi craquelure', 'Craquelure estesa', 'Restauri puntuali', 'Restauri visibili', 'Foderatura'] },
    { key: 'statoCornice', label: 'Stato cornice', options: ['Originale ottimo', 'Originale con usura', 'Restaurata', 'Sostituita', 'Assente'] },
  ],
  Libri: [
    { key: 'autore', label: 'Autore' },
    { key: 'curatore', label: 'Curatore / Traduttore' },
    { key: 'illustratore', label: 'Illustratore' },
    { key: 'editore', label: 'Editore' },
    { key: 'luogoPubblicazione', label: 'Luogo pubblicazione', options: ['Bologna', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Parigi', 'Londra', 'Berlino', 'Altro'] },
    { key: 'annoPubblicazione', label: 'Anno pubblicazione' },
    { key: 'edizione', label: 'Edizione', options: ['Prima edizione', 'Seconda edizione', 'Terza edizione', 'Edizione riveduta', 'Edizione numerata', 'Ristampa anastatica', 'Altro'] },
    { key: 'primaEdizione', label: 'Prima edizione', type: 'bool' },
    { key: 'tiraturaLimitata', label: 'Tiratura limitata', type: 'bool' },
    { key: 'numeroPagine', label: 'N° pagine' },
    { key: 'lingua', label: 'Lingua', options: ['Italiano', 'Latino', 'Francese', 'Inglese', 'Tedesco', 'Spagnolo', 'Greco antico', 'Multilingue', 'Altro'] },
    { key: 'rilegatura', label: 'Rilegatura', options: ['Cartonato', 'Brossura', 'Pergamena', 'Pelle', 'Tela', 'Mezza pelle', 'Piena pelle', 'Mezza tela', 'Altro'] },
    { key: 'dedicaAutografa', label: 'Dedica autografa', type: 'bool' },
    { key: 'firmaAutore', label: 'Firma autore', type: 'bool' },
    { key: 'conservazioneCopertina', label: 'Stato copertina', options: ['Ottimo', 'Buono', 'Discreto — usura normale', 'Con difetti (specificare)', 'Da restaurare'] },
    { key: 'pagineMancanti', label: 'Pagine mancanti', type: 'bool' },
    { key: 'annotazioni', label: 'Annotazioni / Macchie', options: ['Nessuna', 'Lievi foxing', 'Foxing esteso', 'Annotazioni a matita', 'Annotazioni a penna', 'Timbri bibliotecari', "Macchie d'umidità", 'Altro'] },
  ],
  Oggetti: [
    { key: 'tipoOggetto', label: 'Tipo oggetto', options: ['Barometro', 'Bronzetto', 'Candelabro', 'Ceramica', 'Ciotola', 'Cornice', 'Fermacarte', 'Giara', 'Orologio', 'Portachiavi', 'Radio', 'Scultura', 'Specchio', 'Statuetta', 'Strumento musicale', 'Vaso', 'Altro'] },
    { key: 'artista', label: 'Artista / Creatore' },
    { key: 'marchio', label: 'Marchio / Produttore' },
    { key: 'serie', label: 'Serie / Collezione' },
    { key: 'materialeSecondario', label: 'Materiale secondario', options: ['Avorio', 'Bronzo', 'Ceramica', 'Cristallo', 'Cuoio', 'Legno', 'Marmo', 'Metallo', 'Osso', 'Ottone', 'Pietra', 'Smalto', 'Tessuto', 'Vetro', 'Altro'] },
    { key: 'tecnica', label: 'Tecnica esecutiva', options: ['Cesellatura', 'Doratura', 'Forgiatura', 'Fusione a cera persa', 'Incisione', 'Intarsio', 'Lavorazione a mano', 'Manifattura', 'Pressofusione', 'Smaltatura', 'Tornitura', 'Altro'] },
    { key: 'colore', label: 'Colore', options: ['Bianco', 'Blu', 'Bruno', 'Dorato', 'Grigio', 'Multicolore', 'Nero', 'Rosso', 'Verde', 'Altro'] },
    { key: 'soggetto', label: 'Soggetto / Tema', options: ['Animali', 'Figura umana', 'Fiori', 'Geometrico', 'Mitologico', 'Natura', 'Paesaggio', 'Religioso', 'Simbolico', 'Altro'] },
    { key: 'motivoDecorativo', label: 'Motivo decorativo' },
    { key: 'manifattura', label: 'Manifattura', options: ['Capodimonte', 'Deruta', 'Doccia / Richard Ginori', 'Faenza', 'Meissen', 'Sèvres', 'Nove di Bassano', 'Manifattura toscana', 'Ignota', 'Altro'] },
    { key: 'altezza', label: 'Altezza (cm)' },
    { key: 'diametro', label: 'Diametro (cm)' },
    { key: 'crepeScheggiature', label: 'Crepe / Scheggiature', options: ['Nessuna', 'Microfessure (non visibili)', 'Scheggiatura minore', 'Crepa visibile', 'Restauro precedente', 'Più difetti'] },
    { key: 'partiMancanti', label: 'Parti mancanti', type: 'bool' },
    { key: 'testatoFunzionante', label: 'Testato e funzionante', type: 'bool' },
  ],
  Arredo: [
    { key: 'tipoArredo', label: 'Tipo', options: ['Tappeto', 'Kilim', 'Tessile / Arazzo', 'Cuscino', 'Mobile da giardino', 'Fontana', 'Altro'] },
    { key: 'materialeArredo', label: 'Materiale principale', options: ['Lana', 'Seta', 'Cotone', 'Lana e seta', 'Lana e cotone', 'Fibra vegetale', 'Ferro', 'Ghisa', 'Pietra', 'Altro'] },
    { key: 'tecnicaArredo', label: 'Tecnica', options: ['Annodato a mano', 'Tessuto a mano', 'Tessuto a macchina', 'Intrecciato', 'Ricamato', 'Kilim piatto', 'Altro'] },
    { key: 'origineManifattura', label: 'Origine / Manifattura', options: ['Afghanistan', 'Anatolia', 'Caucaso', 'Iran / Persia', 'Iraq', 'Italia', 'Marocco', 'Pakistan', 'Turchia', 'Altro'] },
    { key: 'motivoDecorativo', label: 'Motivo decorativo', options: ['Floreale', 'Geometrico', 'Medaglione', 'Mihrab', 'Paisley', 'Tribale', 'Altro'] },
    { key: 'colore', label: 'Colori predominanti', options: ['Beige / Avorio', 'Blu e rosso', 'Bordeaux', 'Marrone / Terracotta', 'Multicolore', 'Naturale', 'Nero e rosso', 'Verde', 'Altro'] },
    { key: 'nodiDm2', label: 'Nodi per dm² (tappeti)' },
    { key: 'altezzaTappeto', label: 'Altezza (cm)' },
    { key: 'larghezzaTappeto', label: 'Larghezza (cm)' },
    { key: 'usura', label: 'Usura / Strappi', options: ['Nessuna', "Minima — normale per l'età", 'Usura al centro', 'Usura ai bordi', 'Strappi riparati', 'Da restaurare'] },
    { key: 'colorisbiaditi', label: 'Colori sbiaditi', type: 'bool' },
  ],
};


// AI prompt per categoria
export function buildCatawikiPrompt(item: HeritageItem, catawikiCat: CatawikiCat): string {
  const fields = CAT_FIELDS[catawikiCat];
  const specificFieldsJson = fields.map(f => {
    if (f.type === 'bool') return `  "${f.key}": false`;
    if (f.options) return `  "${f.key}": "una tra: ${f.options.join(', ')}"`;
    return `  "${f.key}": ""`;
  }).join(',\n');

  return `Sei un esperto antiquario e storico del design. Conosci case d'asta (Pandolfini, Christie's, Sotheby's, Wright, Quittenbaum, Catawiki) e produttori di design (Cassina, Kartell, Artemide, Knoll, Vitra, Zanotta, Stilnovo, Bitossi, Venini, Brionvega, Olivetti).

CLASSIFICAZIONE:
• Antiquariato: prima del 1900, o fino al 1940 se di manifattura nota
• Modernariato: 1940–1980, design o artigianato di qualità  
• Oggetto comune: produzione industriale post-1980 senza firma → non sovrastimare

STILI AMMESSI: Art Déco | Art Nouveau | Barocco | Bauhaus | Biedermeier | Classico | Eclettico | Impero | Liberty | Luigi XV | Luigi XVI | Memphis | Mid-Century Modern | Modernista | Neoclassico | Pop | Rinascimentale | Rococò | Rustico toscano | Space Age | Vittoriano

REGOLE:
- Tutti i campi in italiano
- Non lasciare mai catawikiStyle, catawikiSubcategory vuoti — usa vocabolario controllato sopra
- catawikiTitle: MAX 80 caratteri — es. "Lampadario Liberty bronzo e vetro soffiato, inizio XX sec." = 57 car. ✓
- Prezzi come range min–max coerente con canale indicato
- Tono: tecnico e diretto — no aggettivi come "pregiato", "raffinato", "elegante"
- Per plastiche vintage: segnala rischio acetone/solventi su bachelite, celluloide, plexiglas

Dati dell'oggetto:
- Nome: ${item.name}
- Descrizione: ${item.description}
- Categoria: ${item.category}
- Anno/Epoca: ${item.year || 'non specificato'}
- Dimensioni: ${item.dimensions || 'non specificate'}
- Condizione: ${item.wearCondition || 'non specificata'}
- Note tecniche: ${item.technicalNotes || 'nessuna'}
- Prezzo attuale: ${(item as any).estimatedValue || item.price || 'non specificato'}

Categoria Catawiki target: ${catawikiCat}

Genera SOLO un JSON valido (nessun testo prima o dopo):
{
  "catawikiTitle": "MAX 80 caratteri — conta prima di scrivere",
  "catawikiSubcategory": "dal vocabolario categoria ${catawikiCat}",
  "catawikiStyle": "uno degli stili ammessi sopra",
  "catawikiMaterial": "materiale principale specifico (es. Noce massello | Vetro soffiato Murano | ABS cromato)",
  "catawikiCountry": "paese di origine se deducibile, altrimenti Italia",
  "catawikiDescription": "3-5 frasi: cosa è · materiali · periodo · stato · attribuzione graduata se applicabile. Senza aggettivi da catalogo. MAX 500 caratteri.",
  "catawikiRestored": false,
${specificFieldsJson}
}`;
}

export function CatawikiModal({ item, onClose, onSave }: {
  item: HeritageItem;
  onClose: () => void;
  onSave: (updated: HeritageItem) => Promise<void>;
}) {
  // Detect category
  const detectedCat = (CAT_MAP[item.category] || 'Oggetti') as CatawikiCat;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(item.catawikiCategory ? 2 : 1);
  const [catawikiCat, setCatawikiCat] = useState<CatawikiCat>(
    (CATAWIKI_CATS.includes(item.catawikiCategory as CatawikiCat) ? item.catawikiCategory : detectedCat) as CatawikiCat
  );
  const [common, setCommon] = useState({
    catawikiTitle: item.catawikiTitle || '',
    catawikiSubcategory: item.catawikiSubcategory || '',
    catawikiStyle: item.catawikiStyle || '',
    catawikiMaterial: item.catawikiMaterial || '',
    catawikiCountry: item.catawikiCountry || 'Italia',
    catawikiRestored: item.catawikiRestored ?? false,
    catawikiWeight: item.catawikiWeight || '',
    catawikiShippingAvailable: item.catawikiShippingAvailable ?? false,
    catawikiPickupAvailable: item.catawikiPickupAvailable ?? true,
    catawikiDescription: item.catawikiDescription || '',
    catawikiImages: (item.catawikiImages?.length ? item.catawikiImages : [item.imageUrl, ...(item.images || [])].filter(Boolean).slice(0, 5)) as string[],
  });
  const [specific, setSpecific] = useState<Record<string, string | boolean>>(
    (item as any).catawikiSpecific || {}
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const allImages = [item.imageUrl, ...(item.images || [])].filter(Boolean) as string[];
  const photoCount = common.catawikiImages.filter(Boolean).length;
  const copyToClipboard = (text: string, key: string) => {
    const done = () => { setCopied(key); setTimeout(() => setCopied(null), 3000); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else { fallbackCopy(text, done); }
  };

  const fallbackCopy = (text: string, done: () => void) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); done(); } catch {}
    document.body.removeChild(ta);
  };

  const runAI = async () => {
    setIsAiLoading(true);
    try {
      const prompt = buildCatawikiPrompt(item, catawikiCat);
      const res = await api.ai({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] });
      if (res.status === 529 || res.status === 503) throw new Error('Server AI sovraccarico — riprova tra qualche secondo');
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message?.includes('overloaded') ? 'Server AI sovraccarico — riprova tra qualche secondo' : e.error?.message || 'Errore API'); }
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Nessun JSON');
      const result = JSON.parse(match[0]);
      const newAiFields = new Set<string>();
      // Apply common fields
      const commonKeys = ['catawikiTitle','catawikiSubcategory','catawikiStyle','catawikiMaterial','catawikiCountry','catawikiDescription','catawikiRestored'];
      const newCommon = { ...common };
      commonKeys.forEach(k => {
        if (result[k] !== undefined && result[k] !== '' && result[k] !== false) {
          (newCommon as any)[k] = result[k];
          newAiFields.add(k);
        }
      });
      setCommon(newCommon);
      // Apply specific fields
      const newSpecific = { ...specific };
      CAT_FIELDS[catawikiCat].forEach(f => {
        if (result[f.key] !== undefined && result[f.key] !== '' && result[f.key] !== false) {
          newSpecific[f.key] = result[f.key];
          newAiFields.add(f.key);
        }
      });
      setSpecific(newSpecific);
      setAiFields(newAiFields);
      setStep(2);
    } catch (e: any) { alert('Errore AI: ' + e.message); }
    finally { setIsAiLoading(false); }
  };

  const buildExportLines = () => {
    const fields = CAT_FIELDS[catawikiCat];
    const selectedPhotos = common.catawikiImages.filter(Boolean);
    return [
      `════════════════════════════════════════`,
      `${item.name.toUpperCase()}`,
      `Categoria Catawiki: ${catawikiCat}`,
      `════════════════════════════════════════`,
      ``,
      `── IDENTIFICAZIONE ─────────────────────`,
      `Titolo lotto:      ${common.catawikiTitle || '—'}`,
      `Sottocategoria:    ${common.catawikiSubcategory || '—'}`,
      `Stile:             ${common.catawikiStyle || '—'}`,
      `Materiale:         ${common.catawikiMaterial || '—'}`,
      `Paese origine:     ${common.catawikiCountry || '—'}`,
      ``,
      `── CRONOLOGIA ──────────────────────────`,
      `Anno/Epoca:        ${item.year || '—'}`,
      ``,
      `── STATO ───────────────────────────────`,
      `Condizione:        ${item.wearCondition || '—'}`,
      `Restaurato:        ${common.catawikiRestored ? 'Sì' : 'No'}`,
      ``,
      `── MISURE ──────────────────────────────`,
      `Dimensioni:        ${item.dimensions || '—'}`,
      `Peso spedizione:   ${common.catawikiWeight || '—'} kg`,
      ``,
      `── LOGISTICA ───────────────────────────`,
      `Spedizione:        ${common.catawikiShippingAvailable ? 'Sì' : 'No'}`,
      `Ritiro:            ${common.catawikiPickupAvailable ? 'Sì' : 'No'}`,
      ``,
      `── ${catawikiCat.toUpperCase()} ─────────────────────────`,
      ...fields.map(f => {
        const val = specific[f.key];
        const display = val === true ? 'Sì' : val === false ? 'No' : (val || '—');
        return `${(f.label + ':').padEnd(20)} ${display}`;
      }),
      ``,
      `── DESCRIZIONE ─────────────────────────`,
      common.catawikiDescription || '—',
      ``,
      `── FOTO (${selectedPhotos.length}/5) ──────────────────────`,
      ...selectedPhotos.map((url, i) => `  ${i + 1}. ${url}`),
    ].join('\n');
  };

  const exportTxt = () => {
    const txt = buildExportLines();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `catawiki-${item.name.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...item, ...common, catawikiCategory: catawikiCat, catawikiSpecific: specific } as HeritageItem);
      setSaveOk(true);
    } catch (e: any) { alert('Errore: ' + (e?.message || 'Riprova')); }
    finally { setIsSaving(false); }
  };

  const stepLabel = ['', 'Categoria', 'Campi comuni', 'Dettagli', 'Foto'][step];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-heritage-ink/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden"
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '95svh', WebkitOverflowScrolling: 'touch' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-heritage-ink/8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#7B1818] rounded-full flex items-center justify-center">
              <ExternalLink size={14} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[15px] text-heritage-ink">Scheda Catawiki</p>
              <p className="text-[11px] text-heritage-ink/50 font-serif italic">{item.name.slice(0, 35)}{item.name.length > 35 ? '…' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-1">
              {[1,2,3,4].map(s => (
                <button key={s} onClick={() => s < step || saveOk ? setStep(s as any) : null}
                  className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${step === s ? 'bg-[#7B1818] text-white' : s < step ? 'bg-heritage-gold/30 text-heritage-gold cursor-pointer' : 'bg-heritage-ink/8 text-heritage-ink/30'}`}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={18} /></button>
          </div>
        </div>

        {/* Step label mobile */}
        <div className="px-6 py-2 bg-heritage-cream/30 border-b border-heritage-ink/5 flex items-center justify-between sm:hidden">
          <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">Step {step}/4 — {stepLabel}</p>
          <div className="flex gap-1">{[1,2,3,4].map(s => <div key={s} className={`w-6 h-1 rounded-full ${s <= step ? 'bg-[#7B1818]' : 'bg-heritage-ink/10'}`} />)}</div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5 space-y-5">

          {/* ── STEP 1: Categoria ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/50 mb-1">Categoria rilevata</p>
                <p className="text-[13px] text-heritage-ink/40 font-serif italic mb-4">Basata su "{item.category}" — puoi cambiarla</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATAWIKI_CATS.map(cat => (
                    <button key={cat} onClick={() => setCatawikiCat(cat)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-left transition-all ${catawikiCat === cat ? 'border-[#7B1818] bg-[#7B1818]/5 text-[#7B1818]' : 'border-heritage-ink/10 text-heritage-ink/60 hover:border-heritage-ink/30'}`}>
                      <span className="font-bold text-[13px]">{cat}</span>
                      {catawikiCat === cat && <Check size={14} className="ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-heritage-gold/8 rounded-2xl border border-heritage-gold/20 flex items-start gap-3">
                <Sparkles size={16} className="text-heritage-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-gold mb-1">Pre-compila con AI</p>
                  <p className="text-[12px] text-heritage-ink/60 font-serif italic">Claude legge i dati dell'oggetto e compila i campi che riesce a dedurre. I campi incerti restano vuoti.</p>
                </div>
              </div>
              <button onClick={runAI} disabled={isAiLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-heritage-gold text-white rounded-2xl font-bold text-[12px] uppercase tracking-widest disabled:opacity-50">
                {isAiLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analisi in corso...</> : <><Sparkles size={14} />Pre-compila con AI e continua</>}
              </button>
              <button onClick={() => setStep(2)}
                className="w-full py-3 border border-heritage-ink/10 rounded-2xl text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40">
                Compila manualmente →
              </button>

              {/* Se scheda già compilata: copia rapida */}
              {item.catawikiTitle && (
                <div className="border-t border-heritage-ink/8 pt-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40 mb-3 text-center">Scheda già compilata</p>
                  <button
                    onClick={() => copyToClipboard(buildExportLines(), 'quickcopy')}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-[12px] font-bold uppercase tracking-widest transition-all ${copied === 'quickcopy' ? 'bg-green-50 border-green-200 text-green-600' : 'border-[#7B1818]/30 text-[#7B1818] bg-[#7B1818]/5 hover:bg-[#7B1818]/10'}`}>
                    {copied === 'quickcopy' ? <><Check size={14} />Copiato!</> : <><Upload size={14} />Copia scheda negli appunti</>}
                  </button>
                  <button
                    onClick={exportTxt}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40 transition-all">
                    <Upload size={12} />Esporta .txt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Campi comuni ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Campi comuni</p>

              {/* Titolo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Titolo lotto *</p>
                    {aiFields.has('catawikiTitle') && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${common.catawikiTitle.length > 60 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{common.catawikiTitle.length}/60</span>
                    <CatawikiCopyBtn text={common.catawikiTitle} fk="title" copied={copied} onCopy={copyToClipboard} />
                  </div>
                </div>
                <input value={common.catawikiTitle} onChange={e => setCommon(p => ({ ...p, catawikiTitle: e.target.value }))}
                  className={`w-full border-b py-2 bg-transparent focus:outline-none font-heritage italic ${common.catawikiTitle.length > 60 ? 'border-red-300' : 'border-heritage-ink/20 focus:border-heritage-gold'}`}
                  style={{ fontSize: '16px' }}
                  placeholder="Titolo ottimizzato per Catawiki…" />
              </div>

              <CatawikiField label="Sottocategoria" fieldKey="catawikiSubcategory" value={common.catawikiSubcategory} isAi={aiFields.has('catawikiSubcategory')} onChange={v => setCommon(p => ({ ...p, catawikiSubcategory: v }))} copied={copied} onCopy={copyToClipboard} />
              <CatawikiField label="Stile" fieldKey="catawikiStyle" value={common.catawikiStyle} isAi={aiFields.has('catawikiStyle')} onChange={v => setCommon(p => ({ ...p, catawikiStyle: v }))} copied={copied} onCopy={copyToClipboard} />
              <CatawikiField label="Materiale principale" fieldKey="catawikiMaterial" value={common.catawikiMaterial} isAi={aiFields.has('catawikiMaterial')} onChange={v => setCommon(p => ({ ...p, catawikiMaterial: v }))} copied={copied} onCopy={copyToClipboard} />
              <CatawikiField label="Paese di origine" fieldKey="catawikiCountry" value={common.catawikiCountry} isAi={aiFields.has('catawikiCountry')} onChange={v => setCommon(p => ({ ...p, catawikiCountry: v }))} copied={copied} onCopy={copyToClipboard} />

              {/* Anno + Dimensioni read-only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Anno/Epoca</p>
                    <CatawikiCopyBtn text={item.year || '—'} fk="year" copied={copied} onCopy={copyToClipboard} />
                  </div>
                  <p className="py-2 text-[13px] font-heritage italic text-heritage-ink/60 border-b border-heritage-ink/8">{item.year || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Dimensioni</p>
                    <CatawikiCopyBtn text={item.dimensions || '—'} fk="dim" copied={copied} onCopy={copyToClipboard} />
                  </div>
                  <p className="py-2 text-[13px] font-heritage italic text-heritage-ink/60 border-b border-heritage-ink/8">{item.dimensions || '—'}</p>
                </div>
              </div>

              {/* Condizione read-only */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Condizione</p>
                  <CatawikiCopyBtn text={item.wearCondition || '—'} fk="cond" copied={copied} onCopy={copyToClipboard} />
                </div>
                <p className="py-2 text-[13px] font-heritage italic text-heritage-ink/60 border-b border-heritage-ink/8">{item.wearCondition || '—'}</p>
              </div>

              {/* Toggle */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {([
                  { key: 'catawikiRestored' as const, label: 'Restaurato' },
                  { key: 'catawikiShippingAvailable' as const, label: 'Spedizione' },
                  { key: 'catawikiPickupAvailable' as const, label: 'Ritiro' },
                ] as { key: keyof typeof common; label: string }[]).map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5 items-center p-3 bg-heritage-cream/30 rounded-xl">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">{label}</p>
                    <CatawikiToggle val={!!common[key]} onToggle={() => setCommon(p => ({ ...p, [key]: !p[key] }))} />
                  </div>
                ))}
              </div>

              {/* Peso */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Peso spedizione (kg)</p>
                <input value={common.catawikiWeight} onChange={e => setCommon(p => ({ ...p, catawikiWeight: e.target.value }))}
                  className="w-full border-b border-heritage-ink/20 py-2 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic"
                  style={{ fontSize: '16px' }}
                  placeholder="es. 12.5" type="number" step="0.1" />
              </div>
            </div>
          )}

          {/* ── STEP 3: Campi categoria ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Dettagli {catawikiCat}</p>
              {CAT_FIELDS[catawikiCat].map(f => (
                f.type === 'bool' ? (
                  <div key={f.key} className="flex items-center justify-between py-2 border-b border-heritage-ink/8">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">{f.label}</p>
                      {aiFields.has(f.key) && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
                    </div>
                    <CatawikiToggle val={!!specific[f.key]} onToggle={() => setSpecific(p => ({ ...p, [f.key]: !p[f.key] }))} />
                  </div>
                ) : (
                  <CatawikiField key={f.key} label={f.label} fieldKey={f.key}
                    value={String(specific[f.key] ?? '')}
                    isAi={aiFields.has(f.key)}
                    options={f.options}
                    onChange={v => setSpecific(p => ({ ...p, [f.key]: v }))}
                    copied={copied} onCopy={copyToClipboard} />
                )
              ))}
            </div>
          )}

          {/* ── STEP 4: Descrizione + Foto ── */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Descrizione */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Descrizione</p>
                    {aiFields.has('catawikiDescription') && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${common.catawikiDescription.length > 500 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{common.catawikiDescription.length}/500</span>
                    <CatawikiCopyBtn text={common.catawikiDescription} fk="desc" copied={copied} onCopy={copyToClipboard} />
                  </div>
                </div>
                <textarea value={common.catawikiDescription} onChange={e => setCommon(p => ({ ...p, catawikiDescription: e.target.value }))}
                  className="w-full border border-heritage-ink/12 rounded-2xl p-4 bg-heritage-cream/20 focus:outline-none focus:border-heritage-gold resize-none font-heritage italic leading-relaxed"
                  style={{ fontSize: '16px' }}
                  rows={6} placeholder="Descrizione in stile asta Catawiki…" />
              </div>

              {/* Foto */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Foto ({photoCount}/5)</p>
                  {photoCount < 5 && <p className="text-[11px] text-orange-500 font-bold">Mancano {5 - photoCount}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {allImages.map((img, i) => {
                    const sel = common.catawikiImages.includes(img);
                    const idx = common.catawikiImages.indexOf(img);
                    return (
                      <div key={i} onClick={() => {
                        setCommon(p => {
                          const imgs = p.catawikiImages.includes(img)
                            ? p.catawikiImages.filter(u => u !== img)
                            : p.catawikiImages.length < 5 ? [...p.catawikiImages, img] : p.catawikiImages;
                          return { ...p, catawikiImages: imgs };
                        });
                      }}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${sel ? 'border-[#7B1818]' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                        {sel && <div className="absolute top-1 right-1 w-5 h-5 bg-[#7B1818] rounded-full flex items-center justify-center text-white text-[9px] font-bold">{idx + 1}</div>}
                      </div>
                    );
                  })}
                </div>
                {allImages.length === 0 && <p className="text-[12px] italic text-heritage-ink/40 text-center py-6">Nessuna foto disponibile — aggiungile dal form oggetto</p>}
              </div>

              {/* Copia tutto */}
              <button onClick={() => copyToClipboard(buildExportLines(), 'all')}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-[12px] font-bold uppercase tracking-widest transition-all ${copied === 'all' ? 'bg-green-50 border-green-200 text-green-600' : 'border-heritage-ink/10 text-heritage-ink/50 hover:bg-heritage-cream/40'}`}>
                {copied === 'all' ? '✓ Copiato!' : 'Copia tutto negli appunti'}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-heritage-ink/8 bg-white flex-shrink-0">
          <div className="flex gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(s => (s - 1) as any)}
                className="px-4 py-3 rounded-xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40 flex-shrink-0">
                ← Indietro
              </button>
            ) : (
              <button onClick={onClose}
                className="px-4 py-3 rounded-xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40 flex-shrink-0">
                Annulla
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(s => (s + 1) as any)}
                className="flex-1 py-3 bg-[#7B1818] text-white rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-[#5a1212] transition-colors">
                Avanti →
              </button>
            ) : (
              <div className="flex gap-2 flex-1">
                <button onClick={saveOk ? exportTxt : handleSave} disabled={isSaving}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${saveOk ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-[#7B1818] hover:bg-[#5a1212] text-white'}`}>
                  {isSaving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvataggio...</>
                    : saveOk
                      ? <><Upload size={14} />Esporta .txt</>
                      : 'Salva scheda'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
