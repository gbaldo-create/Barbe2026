import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

// ─── App ──────────────────────────────────────────────────────────────────────
export function ScrollReveal({ children, className, delay = 0, y = 24 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex items-center gap-2 transition-all pb-1 border-b-2 font-heritage text-lg ${active ? 'border-heritage-gold text-heritage-gold font-bold' : 'border-transparent text-white/50 hover:text-white'}`}>{icon}<span>{label}</span></button>;
}

export function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-heritage-ink/6 last:border-b-0">
      <span className="block text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40 mb-0.5">{label}</span>
      <span className="block font-serif text-[15px] italic text-heritage-ink/85 leading-snug">{value}</span>
    </div>
  );
}
