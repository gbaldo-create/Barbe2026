import { HeritageItem } from '../types.ts';

// ─── AntiquarianSection ───────────────────────────────────────────────────────

export function AntiquarianSection({ item }: { item: HeritageItem }) {
  const common = [
    { label: 'Sottocategoria', value: item.catawikiSubcategory },
    { label: 'Stile', value: item.catawikiStyle },
    { label: 'Materiale', value: item.catawikiMaterial },
    { label: 'Paese di origine', value: item.catawikiCountry },
    { label: 'Condizione', value: item.wearCondition },
    { label: 'Restaurato', value: item.catawikiRestored ? 'Sì' : undefined },
    { label: 'Peso spedizione', value: item.catawikiWeight ? `${item.catawikiWeight} kg` : undefined },
    { label: 'Spedizione', value: item.catawikiShippingAvailable ? 'Disponibile' : undefined },
    { label: 'Ritiro', value: item.catawikiPickupAvailable ? 'Disponibile' : undefined },
  ].filter(f => f.value);

  const specific = Object.entries((item as any).catawikiSpecific || {})
    .filter(([, v]) => v !== '' && v !== false && v !== undefined)
    .map(([k, v]) => ({
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
      value: v === true ? 'Sì' : String(v),
    }));

  const hasDescription = !!item.catawikiDescription;
  const hasAny = common.length > 0 || specific.length > 0 || hasDescription;
  if (!hasAny) return null;

  return (
    <div className="mt-2 rounded-2xl border border-heritage-ink/12 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 bg-heritage-ink/4 border-b border-heritage-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-heritage-gold" />
          <h5 className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink">Scheda Antiquaria</h5>
        </div>
        {item.catawikiCategory && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-heritage-gold/15 text-heritage-gold rounded-full">
            {item.catawikiCategory}
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Descrizione */}
        {hasDescription && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-heritage-ink mb-2">Descrizione</p>
            <p className="text-base leading-relaxed text-heritage-ink/85 font-serif italic">{item.catawikiDescription}</p>
          </div>
        )}

        {/* Campi comuni */}
        {common.length > 0 && (
          <>
            {hasDescription && <div className="border-t border-heritage-ink/8" />}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {common.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-heritage-ink mb-0.5">{label}</p>
                  <p className="text-[15px] font-heritage italic text-heritage-ink">{String(value)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Campi specifici categoria */}
        {specific.length > 0 && (
          <>
            <div className="border-t border-heritage-ink/8" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-heritage-ink mb-4">Dettagli {item.catawikiCategory || 'categoria'}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {specific.map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-heritage-ink mb-0.5">{label}</p>
                    <p className="text-[15px] font-heritage italic text-heritage-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
