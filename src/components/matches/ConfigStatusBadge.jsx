import React from "react";

const normalizeStatus = (status) => String(status || "UNKNOWN").trim().toUpperCase();

const ConfigStatusBadge = ({ status, className = "" }) => {
  const normalized = normalizeStatus(status);
  const styleMap = {
    VALID: {
      label: "Ready",
      classes: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
    },
    CONFIG_LOCKED: {
      label: "Locked",
      classes: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
    },
    CONFIG_MISMATCH: {
      label: "Mismatch",
      classes: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]",
    },
    LIVE: {
      label: "Live",
      classes: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]",
    },
    UNKNOWN: {
      label: "Unknown",
      classes: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
    },
  };
  const preset = styleMap[normalized] || styleMap.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${preset.classes} ${className}`.trim()}
      aria-label={`Configuration status: ${preset.label}`}
      title={`Configuration status: ${preset.label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
      {preset.label}
    </span>
  );
};

export default ConfigStatusBadge;
