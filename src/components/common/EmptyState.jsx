import React from 'react';
import { FolderOpen } from 'lucide-react';
import DashboardCard from './DashboardCard';

const EmptyState = ({ title = "Nothing here yet", message = "Items will appear here when available.", icon = FolderOpen, action, variant }) => {
  const StateIcon = icon;
  const content = (
    <>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-soft)]" aria-hidden="true">
        <StateIcon size={24} />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-[var(--text-main)]">{title}</h3>
      <p className="mb-4 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>
      {action && <div>{action}</div>}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        {content}
      </div>
    );
  }

  return (
    <DashboardCard className="flex flex-col items-center justify-center border-dashed p-5 text-center sm:p-8">
      {content}
    </DashboardCard>
  );
};

export default EmptyState;
