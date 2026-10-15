import { useState } from 'react';

export function LoginForm({ onLogin }: { onLogin: (username: string, pwd: string) => Promise<void> | void }) {
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const field = 'w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-base transition-colors';
  return (
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await onLogin(username.trim(), pwd); } finally { setBusy(false); } }} className="p-8 space-y-6">
      <div className="p-4 bg-heritage-cream/30 rounded-2xl text-sm text-heritage-ink/80 leading-relaxed">
        <p className="font-bold text-sm uppercase tracking-widest text-heritage-ink/65 mb-2">Accesso riservato</p>
        <p>Per i familiari con un account. Se non ricordi la password, chiedi all'amministratore di impostarne una nuova.</p>
      </div>
      <div className="space-y-2">
        <label className="text-[12px] uppercase font-bold tracking-widest opacity-70 block">Nome utente</label>
        <input type="text" autoComplete="username" autoCapitalize="none" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="es. olivia" className={field} />
      </div>
      <div className="space-y-2">
        <label className="text-[12px] uppercase font-bold tracking-widest opacity-70 block">Password</label>
        <input type="password" autoComplete="current-password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••••" className={field} />
      </div>
      <button type="submit" disabled={!username || !pwd || busy} className="w-full heritage-button py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{busy ? 'Accesso…' : 'Accedi'}</button>
    </form>
  );
}
