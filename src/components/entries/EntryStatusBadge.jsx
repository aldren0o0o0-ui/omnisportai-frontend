import { formatStatusLabel } from "../common/statusLabels";

const STATUS_CLASSES = {
  DRAFT: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
  INCOMPLETE: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]",
  PENDING_REVIEW: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
  APPROVED: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
  REJECTED: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
  EXPIRED: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-soft)]",
  UNKNOWN: "border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-soft)]",
};

const EntryStatusBadge = ({ status }) => {
  const normalized = String(status || "DRAFT").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const styleClass = STATUS_CLASSES[normalized] || STATUS_CLASSES.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styleClass}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
};

export default EntryStatusBadge;
