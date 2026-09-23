const toneClassMap = {
  success:
    "border-[color-mix(in_srgb,var(--success)_30%,var(--border-soft))] bg-[var(--success-soft)] text-[var(--success)]",
  error:
    "border-[color-mix(in_srgb,var(--danger)_30%,var(--border-soft))] bg-[var(--danger-soft)] text-[var(--danger)]",
  warning:
    "border-[color-mix(in_srgb,var(--warning)_30%,var(--border-soft))] bg-[var(--warning-soft)] text-[var(--warning)]",
  info:
    "border-[color-mix(in_srgb,var(--info)_30%,var(--border-soft))] bg-[var(--info-soft)] text-[var(--info)]",
};

const SettingsStatusBanner = ({ type = "info", message = "", onDismiss = null }) => {
  const normalizedMessage = String(message || "").trim();
  if (!normalizedMessage) return null;
  const toneClass = toneClassMap[type] || toneClassMap.info;
  const role = type === "error" ? "alert" : "status";
  return (
    <div className={`rounded-[var(--radius-md)] border p-4 text-sm font-medium ${toneClass}`} role={role}>
      <div className="flex items-start justify-between gap-3">
        <span>{normalizedMessage}</span>
        {typeof onDismiss === "function" ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-sm text-xs font-semibold opacity-80 transition-opacity duration-150 hover:opacity-100 motion-reduce:transition-none"
            aria-label="Dismiss message"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SettingsStatusBanner;
