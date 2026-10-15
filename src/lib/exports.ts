import { HeritageItem } from '../types.ts';

// ─── helpers per esportare JSON ───────────────────────────────────────────────

export function downloadJson(items: HeritageItem[]) {
  const clean = items.map(({ isFavorite, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'items.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportCatawikiTxt(items: HeritageItem[]) {
  const compiled = items.filter(i =>
    i.catawikiTitle || i.catawikiDescription || i.catawikiCategory
  );
  if (compiled.length === 0) { alert('Nessuna scheda Catawiki compilata.'); return; }

  const sections = compiled.map((item, idx) => {
    const allPhotos = [item.imageUrl, ...(item.images || [])].filter(Boolean);
    const selectedPhotos = item.catawikiImages?.length ? item.catawikiImages : allPhotos.slice(0, 5);
    return [
      `════════════════════════════════════════`,
      `OGGETTO ${idx + 1} di ${compiled.length}: ${item.name}`,
      `════════════════════════════════════════`,
      `TITOLO:       ${item.catawikiTitle || ''}`,
      `CATEGORIA:    ${item.catawikiCategory || ''}${item.catawikiSubcategory ? ` > ${item.catawikiSubcategory}` : ''}`,
      `STILE:        ${item.catawikiStyle || ''}`,
      `MATERIALE:    ${item.catawikiMaterial || ''}`,
      `PAESE:        ${item.catawikiCountry || ''}`,
      `ANNO/PERIODO: ${item.year || ''}`,
      `DIMENSIONI:   ${item.dimensions || ''}`,
      `CONDIZIONE:   ${item.wearCondition || ''}`,
      `RESTAURATO:   ${item.catawikiRestored ? 'Si' : 'No'}`,
      `PESO:         ${item.catawikiWeight || 'n/d'}`,
      `SPEDIZIONE:   ${item.catawikiShippingAvailable ? 'Si' : 'No'}`,
      `RITIRO:       ${item.catawikiPickupAvailable ? 'Si' : 'No'}`,
      ``,
      `DESCRIZIONE:`,
      item.catawikiDescription || '',
      ``,
      `FOTO (${selectedPhotos.length}):`,
      ...selectedPhotos.map((url, i) => `  ${i + 1}. ${url}`),
    ].join('\n');
  });

  const txt = sections.join('\n\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catawiki-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportSingleCatawiki(item: HeritageItem) {
  const allPhotos = [item.imageUrl, ...(item.images || [])].filter(Boolean);
  const selectedPhotos = item.catawikiImages?.length ? item.catawikiImages : allPhotos.slice(0, 5) as string[];
  const specific = Object.entries((item as any).catawikiSpecific || {})
    .filter(([, v]) => v !== '' && v !== false && v !== undefined)
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      return `${(label + ':').padEnd(20)} ${v === true ? 'Sì' : String(v)}`;
    });

  const lines = [
    `════════════════════════════════════════`,
    `${item.name.toUpperCase()}`,
    `Categoria Catawiki: ${item.catawikiCategory || '—'}`,
    `════════════════════════════════════════`,
    ``,
    `── IDENTIFICAZIONE ─────────────────────`,
    `Titolo lotto:      ${item.catawikiTitle || '—'}`,
    `Sottocategoria:    ${item.catawikiSubcategory || '—'}`,
    `Stile:             ${item.catawikiStyle || '—'}`,
    `Materiale:         ${item.catawikiMaterial || '—'}`,
    `Paese origine:     ${item.catawikiCountry || '—'}`,
    ``,
    `── CRONOLOGIA ──────────────────────────`,
    `Anno/Epoca:        ${item.year || '—'}`,
    ``,
    `── STATO ───────────────────────────────`,
    `Condizione:        ${item.wearCondition || '—'}`,
    `Restaurato:        ${item.catawikiRestored ? 'Sì' : 'No'}`,
    ``,
    `── MISURE ──────────────────────────────`,
    `Dimensioni:        ${item.dimensions || '—'}`,
    `Peso spedizione:   ${item.catawikiWeight || '—'} kg`,
    ``,
    `── LOGISTICA ───────────────────────────`,
    `Spedizione:        ${item.catawikiShippingAvailable ? 'Sì' : 'No'}`,
    `Ritiro:            ${item.catawikiPickupAvailable ? 'Sì' : 'No'}`,
  ];

  if (specific.length > 0) {
    lines.push('', `── DETTAGLI ${(item.catawikiCategory || 'CATEGORIA').toUpperCase()} ─────────────────────`);
    lines.push(...specific);
  }

  lines.push(
    ``,
    `── DESCRIZIONE ─────────────────────────`,
    item.catawikiDescription || '—',
    ``,
    `── FOTO (${selectedPhotos.length}) ──────────────────────────`,
    ...selectedPhotos.map((url, i) => `  ${i + 1}. ${url}`),
  );

  const txt = lines.join('\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catawiki-${item.name.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
