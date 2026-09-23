import React from 'react';

const SectionTabs = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div role="tablist" aria-label="Page sections" className="mb-4 flex max-w-full snap-x snap-mandatory space-x-1 overflow-x-auto overscroll-x-contain border-b border-[var(--border-soft)] pb-px [scrollbar-width:thin]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`min-h-11 shrink-0 snap-start whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 sm:px-4 motion-reduce:transition-none ${
              isActive
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <tab.icon size={16} aria-hidden="true" />}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SectionTabs;
