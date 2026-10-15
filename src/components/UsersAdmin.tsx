// Pannello "Gestione utenti" (solo amministratori) e finestra "Cambia password"
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, KeyRound, Trash2, Sparkles, Copy, Check, Shield, Power } from 'lucide-react';
import { api, ApiError, randomPassword, ROLE_HINTS, ROLE_LABELS, type AdminUserRow, type Role, type SessionUser, type UsersList } from '../api';

type Notify = (msg: string, type?: 'success' | 'error') => void;
const ROLES: Role[] = ['admin', 'editor', 'autore', 'famiglia'];
const label = 'text-[11px] uppercase font-bold tracking-widest text-heritage-ink/60 block mb-1.5';
const input = 'w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-[15px] focus:outline-none focus:border-heritage-gold';

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        className={`bg-heritage-cream w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl`}
        onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Header({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-heritage-cream/95 backdrop-blur px-6 py-5 border-b border-heritage-ink/8 flex items-center justify-between">
      <div>
        <h3 className="text-2xl font-serif text-heritage-ink">{title}</h3>
        {subtitle && <p className="text-[11px] uppercase tracking-widest text-heritage-ink/55 font-bold mt-1">{subtitle}</p>}
      </div>
      <button onClick={onClose} aria-label="Chiudi" className="p-2 hover:bg-heritage-ink/5 rounded-full"><X size={20} /></button>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}
      className="inline-flex items-center gap-2 font-mono text-[15px] bg-white border border-heritage-gold/40 rounded-lg px-3 py-1.5 hover:border-heritage-gold">
      {value} {done ? <Check size={14} className="text-heritage-olive" /> : <Copy size={14} className="text-heritage-ink/40" />}
    </button>
  );
}

// ── Gestione utenti ──────────────────────────────────────────────────────────
export function UsersAdminModal({ isOpen, onClose, currentUsername, onNotify }: {
  isOpen: boolean; onClose: () => void; currentUsername: string; onNotify: Notify;
}) {
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [month, setMonth] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', displayName: '', role: 'autore' as Role, password: randomPassword(), aiEnabled: false, monthlyLimit: 50 });

  const [warning, setWarning] = useState<string | null>(null);
  const load = (r: UsersList) => { setRows(r.users); setMonth(r.month); setWarning(r.warning || null); };
  const run = async (key: string, fn: () => Promise<UsersList>, ok?: string) => {
    setBusy(key);
    try { load(await fn()); if (ok) onNotify(ok); }
    catch (e) { onNotify(e instanceof ApiError ? e.message : 'Errore di rete', 'error'); }
    finally { setBusy(null); }
  };

  useEffect(() => {
    if (!isOpen) return;
    setRows(null); setIssued(null); setShowNew(false); setConfirmDelete(null);
    api.users.list().then(load).catch(e => onNotify(e instanceof ApiError ? e.message : 'Errore di rete', 'error'));
  }, [isOpen]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { username: form.username.trim().toLowerCase(), displayName: form.displayName.trim(), role: form.role, password: form.password, ai: { enabled: form.aiEnabled, monthlyLimit: form.monthlyLimit } };
    setBusy('create');
    try {
      load(await api.users.create(payload));
      setIssued({ username: payload.username, password: payload.password });
      setShowNew(false);
      setForm({ username: '', displayName: '', role: 'autore', password: randomPassword(), aiEnabled: false, monthlyLimit: 50 });
    } catch (err) { onNotify(err instanceof ApiError ? err.message : 'Errore di rete', 'error'); }
    finally { setBusy(null); }
  };

  const resetPassword = (u: AdminUserRow) => {
    const password = randomPassword();
    run(`pw-${u.username}`, async () => { const r = await api.users.resetPassword(u.username, password); setIssued({ username: u.username, password }); return r; });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay onClose={onClose} wide>
          <Header title="Gestione utenti" subtitle={`Ruoli, accessi e AI · consumi di ${month || '…'}`} onClose={onClose} />
          <div className="p-6 space-y-5">
            {issued && (
              <div className="p-4 rounded-2xl bg-white border border-heritage-gold/40 space-y-2">
                <p className="text-[15px] text-heritage-ink">Password temporanea per <strong>{issued.username}</strong>. Comunicala di persona: al primo accesso dovrà sceglierne una nuova.</p>
                <div className="flex items-center gap-3 flex-wrap"><CopyValue value={issued.password} />
                  <button onClick={() => setIssued(null)} className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50 hover:text-heritage-ink">Fatto</button></div>
              </div>
            )}

            {warning && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-[14px] text-red-700">{warning}</div>}

            {!rows && <p className="text-heritage-ink/50 italic font-serif">Caricamento utenti…</p>}

            {rows && (
              <ul className="space-y-3">
                {rows.map(u => {
                  const self = u.username === currentUsername;
                  const pending = busy?.endsWith(u.username);
                  return (
                    <li key={u.username} className={`bg-white rounded-2xl border border-heritage-ink/8 p-4 ${u.disabled ? 'opacity-60' : ''} ${pending ? 'animate-pulse' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-heritage-gold text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                          {u.builtin ? <Shield size={16} /> : u.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-lg leading-tight text-heritage-ink truncate">{u.displayName} <span className="text-heritage-ink/40 text-sm font-sans">@{u.username}</span>{self && <span className="ml-2 text-[10px] uppercase tracking-widest font-bold text-heritage-gold">tu</span>}</p>
                          <p className="text-[12px] text-heritage-ink/55">
                            {u.builtin ? "Amministratore di emergenza · si gestisce dalle variabili d'ambiente di Vercel" : ROLE_HINTS[u.role]}
                            {u.disabled && ' · disattivato'}{!u.builtin && u.mustChangePassword && ' · deve cambiare password'}
                          </p>
                        </div>
                      </div>

                      {!u.builtin && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <span className={label}>Ruolo</span>
                              <select value={u.role} disabled={!!busy} onChange={e => run(`role-${u.username}`, () => api.users.update(u.username, { role: e.target.value as Role }), 'Ruolo aggiornato ✓')}
                                className="bg-heritage-cream/60 border border-heritage-ink/12 rounded-xl px-3 py-2 text-[14px]">
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className={label}>AI</span>
                              <div className="flex items-center gap-2">
                                <button type="button" disabled={!!busy} onClick={() => run(`ai-${u.username}`, () => api.users.update(u.username, { ai: { enabled: !u.ai.enabled, monthlyLimit: u.ai.monthlyLimit } }), u.ai.enabled ? 'AI disattivata' : 'AI attivata ✓')}
                                  aria-pressed={u.ai.enabled} className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${u.ai.enabled ? 'bg-heritage-gold' : 'bg-heritage-ink/15'}`}>
                                  <span className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${u.ai.enabled ? 'translate-x-5' : ''}`} />
                                </button>
                                <input type="number" min={0} defaultValue={u.ai.monthlyLimit} disabled={!u.ai.enabled || !!busy} title="Richieste al mese (0 = senza limite)"
                                  onBlur={e => { const v = Number(e.target.value) || 0; if (v !== u.ai.monthlyLimit) run(`lim-${u.username}`, () => api.users.update(u.username, { ai: { enabled: u.ai.enabled, monthlyLimit: v } }), 'Limite aggiornato ✓'); }}
                                  className="w-20 bg-heritage-cream/60 border border-heritage-ink/12 rounded-xl px-2 py-2 text-[14px] disabled:opacity-40" />
                                <span className="text-[12px] text-heritage-ink/55 whitespace-nowrap"><Sparkles size={12} className="inline -mt-0.5" /> {u.usage.calls}{u.ai.monthlyLimit ? ` / ${u.ai.monthlyLimit}` : ''} questo mese</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button disabled={!!busy} onClick={() => resetPassword(u)} title="Nuova password temporanea" className="p-2.5 rounded-full hover:bg-heritage-ink/5 text-heritage-ink/60"><KeyRound size={17} /></button>
                            {!self && <button disabled={!!busy} onClick={() => run(`dis-${u.username}`, () => api.users.update(u.username, { disabled: !u.disabled }), u.disabled ? 'Utente riattivato ✓' : 'Utente disattivato')} title={u.disabled ? 'Riattiva' : 'Disattiva'} className="p-2.5 rounded-full hover:bg-heritage-ink/5 text-heritage-ink/60"><Power size={17} /></button>}
                            {!self && (confirmDelete === u.username
                              ? <button disabled={!!busy} onClick={() => { setConfirmDelete(null); run(`del-${u.username}`, () => api.users.remove(u.username), 'Utente eliminato'); }} className="px-3 py-2 rounded-full bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest">Conferma</button>
                              : <button disabled={!!busy} onClick={() => setConfirmDelete(u.username)} title="Elimina" className="p-2.5 rounded-full hover:bg-red-50 text-red-400"><Trash2 size={17} /></button>)}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {rows && !showNew && (
              <button onClick={() => setShowNew(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full border-2 border-dashed border-heritage-ink/15 text-heritage-ink/70 hover:border-heritage-gold hover:text-heritage-ink font-bold text-[12px] uppercase tracking-widest">
                <UserPlus size={16} /> Nuovo utente
              </button>
            )}

            {showNew && (
              <form onSubmit={create} className="bg-white rounded-2xl border border-heritage-gold/30 p-5 space-y-4">
                <p className="font-serif text-xl">Nuovo utente</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><span className={label}>Nome utente</span><input required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} placeholder="es. olivia" className={input} autoCapitalize="none" /></div>
                  <div><span className={label}>Nome visualizzato</span><input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="es. Olivia" className={input} /></div>
                </div>
                <div>
                  <span className={label}>Ruolo</span>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ROLES.map(r => (
                      <button type="button" key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`text-left rounded-xl px-3 py-2.5 border transition-colors ${form.role === r ? 'border-heritage-olive bg-heritage-olive text-white' : 'border-heritage-ink/10 bg-heritage-cream/40 text-heritage-ink'}`}>
                        <span className="block text-[13px] font-bold uppercase tracking-wider">{ROLE_LABELS[r]}</span>
                        <span className={`block text-[12px] ${form.role === r ? 'text-white/75' : 'text-heritage-ink/55'}`}>{ROLE_HINTS[r]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={label}>Password temporanea</span>
                  <div className="flex gap-2"><input required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={`${input} font-mono`} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, password: randomPassword() }))} className="px-3 rounded-xl border border-heritage-ink/12 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">Genera</button></div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.aiEnabled} onChange={e => setForm(f => ({ ...f, aiEnabled: e.target.checked }))} className="w-4 h-4 accent-[#C5A059]" />
                  <span className="text-[15px]">Può usare l'AI</span>
                  {form.aiEnabled && <span className="flex items-center gap-2 text-[13px] text-heritage-ink/60">limite <input type="number" min={0} value={form.monthlyLimit} onChange={e => setForm(f => ({ ...f, monthlyLimit: Number(e.target.value) || 0 }))} className="w-20 border border-heritage-ink/12 rounded-lg px-2 py-1" /> al mese (0 = nessuno)</span>}
                </label>
                <div className="flex gap-3 justify-end pt-1">
                  <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-widest text-heritage-ink/60">Annulla</button>
                  <button type="submit" disabled={busy === 'create'} className="heritage-button">{busy === 'create' ? 'Creo…' : 'Crea utente'}</button>
                </div>
              </form>
            )}
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

// ── Cambia password ──────────────────────────────────────────────────────────
export function ChangePasswordModal({ isOpen, onClose, forced, onDone, onNotify }: {
  isOpen: boolean; onClose: () => void; forced?: boolean; onDone: (u: SessionUser) => void; onNotify: Notify;
}) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [rep, setRep] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) { setCur(''); setNext(''); setRep(''); } }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== rep) return onNotify('Le due password non coincidono', 'error');
    setBusy(true);
    try { const u = await api.changePassword(cur, next); onDone(u); onNotify('Password aggiornata ✓'); onClose(); }
    catch (err) { onNotify(err instanceof ApiError ? err.message : 'Errore di rete', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay onClose={onClose}>
          <Header title="Cambia password" subtitle={forced ? 'Primo accesso: scegli la tua password' : undefined} onClose={onClose} />
          <form onSubmit={submit} className="p-6 space-y-4">
            {forced && <p className="text-[15px] text-heritage-ink/75">Stai usando una password temporanea. Scegline una personale di almeno 8 caratteri.</p>}
            <div><span className={label}>{forced ? 'Password temporanea' : 'Password attuale'}</span><input type="password" required value={cur} onChange={e => setCur(e.target.value)} className={input} autoComplete="current-password" /></div>
            <div><span className={label}>Nuova password</span><input type="password" required minLength={8} value={next} onChange={e => setNext(e.target.value)} className={input} autoComplete="new-password" /></div>
            <div><span className={label}>Ripeti nuova password</span><input type="password" required minLength={8} value={rep} onChange={e => setRep(e.target.value)} className={input} autoComplete="new-password" /></div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-widest text-heritage-ink/60">{forced ? 'Più tardi' : 'Annulla'}</button>
              <button type="submit" disabled={busy} className="heritage-button">{busy ? 'Salvo…' : 'Salva'}</button>
            </div>
          </form>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
