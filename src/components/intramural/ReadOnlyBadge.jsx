import React from 'react';
import { Lock } from 'lucide-react';

// Small pill signalling a historical/read-only intramural. Editing controls for
// COMPLETED/ARCHIVED seasons are already blocked server-side; this makes the
// read-only state visible in the UI.
const ReadOnlyBadge = ({ label = 'Read-only', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}
  >
    <Lock size={10} />
    {label}
  </span>
);

export default ReadOnlyBadge;
