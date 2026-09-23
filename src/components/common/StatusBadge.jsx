import React from 'react';
import { formatStatusLabel, isKnownStatus } from './statusLabels';

const StatusBadge = ({ status, customLabel }) => {
  const normStatus = (status || '').toUpperCase().replace(/[\s-]+/g, '_');

  const getStyle = () => {
    switch (normStatus) {
      case 'PENDING':
      case 'DRAFT':
        return 'bg-[var(--warning-soft)] text-[var(--warning)]';
      case 'FOR_TRYOUT':
      case 'SCHEDULED':
      case 'UPCOMING':
      case 'IN_USE':
        return 'bg-[var(--info-soft)] text-[var(--info)]';
      case 'ACCEPTED':
      case 'ACCEPTED_AS_PLAYER':
      case 'APPROVED':
      case 'AVAILABLE':
      case 'READY':
      case 'ASSIGNED':
      case 'LIVE':
      case 'ACTIVE':
        return 'bg-[var(--success-soft)] text-[var(--success)]';
      case 'REJECTED':
      case 'REMOVED':
      case 'CONFLICT':
      case 'UNAVAILABLE':
      case 'DANGER':
        return 'bg-[var(--danger-soft)] text-[var(--danger)]';
      case 'COMPLETED':
      case 'FINALIZED':
      case 'CANCELLED':
      case 'ELIMINATED_AFTER_TRYOUT':
      case 'ARCHIVED':
      case 'INACTIVE':
        return 'bg-[var(--surface-muted)] text-[var(--text-muted)]';
      case 'RESOLVED':
      case 'GENERATED':
        return 'bg-[var(--primary-soft)] text-[var(--primary)]';
      default:
        return 'bg-[var(--surface-muted)] text-[var(--text-soft)] border border-dashed border-[var(--border-soft)]';
    }
  };

  const displayLabel = customLabel || formatStatusLabel(status) || normStatus.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${getStyle()}`}
      title={!customLabel && !isKnownStatus(status) && status ? `Status: ${normStatus.replace(/_/g, ' ')}` : undefined}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
