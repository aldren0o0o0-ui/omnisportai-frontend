import React from 'react';
import { intramuralStatusLabel, intramuralStatusStyle } from './intramuralStatus';

// Small pill showing an intramural season's lifecycle status
// (ACTIVE / READY / PLANNING / DRAFT / COMPLETED / ARCHIVED).
const IntramuralStatusBadge = ({ status, className = '' }) => {
  const statusKey = String(status || 'DRAFT').toUpperCase();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide ${intramuralStatusStyle(statusKey)} ${className}`}
    >
      {intramuralStatusLabel(statusKey)}
    </span>
  );
};

export default IntramuralStatusBadge;
