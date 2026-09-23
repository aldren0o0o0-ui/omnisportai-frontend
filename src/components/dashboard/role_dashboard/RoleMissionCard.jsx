import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardCard from "../../common/DashboardCard";
import { useAuth } from "../../../context/AuthContext";
import {
  isRoleMissionCardPermanentlyHidden,
  isRoleMissionCardSessionDismissed,
  setRoleMissionCardSessionDismissed,
} from "../../../utils/roleMissionCardPreferences";

const ACCENT_STYLES = {
  blue: {
    shell:
      "border-[var(--border-soft)] bg-[var(--surface-soft)]",
    icon: "bg-blue-600 text-white",
    badge:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
    primaryButton: "bg-blue-600 text-white hover:bg-blue-500",
    secondaryButton:
      "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-500/10",
    dismissButton:
      "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-soft)] focus-visible:ring-blue-400/70 dark:focus-visible:ring-blue-300/60",
  },
  emerald: {
    shell:
      "border-[var(--border-soft)] bg-[var(--surface-soft)]",
    icon: "bg-emerald-600 text-white",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    primaryButton: "bg-emerald-600 text-white hover:bg-emerald-500",
    secondaryButton:
      "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-500/10",
    dismissButton:
      "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-soft)] focus-visible:ring-emerald-400/70 dark:focus-visible:ring-emerald-300/60",
  },
  violet: {
    shell:
      "border-[var(--border-soft)] bg-[var(--surface-soft)]",
    icon: "bg-violet-600 text-white",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
    primaryButton: "bg-violet-600 text-white hover:bg-violet-500",
    secondaryButton:
      "border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-500/10",
    dismissButton:
      "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-soft)] focus-visible:ring-violet-400/70 dark:focus-visible:ring-violet-300/60",
  },
  amber: {
    shell:
      "border-[var(--border-soft)] bg-[var(--surface-soft)]",
    icon: "bg-amber-600 text-white",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
    primaryButton: "bg-amber-600 text-white hover:bg-amber-500",
    secondaryButton:
      "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/10",
    dismissButton:
      "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-soft)] focus-visible:ring-amber-400/70 dark:focus-visible:ring-amber-300/60",
  },
};

const RoleMissionCard = ({
  icon: Icon,
  roleLabel,
  title,
  description,
  highlights = [],
  statusLabel = "Role Focus",
  accent = "blue",
  actions = [],
  dismissible = true,
  onClose,
}) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;
  const safeHighlights = Array.isArray(highlights) ? highlights.filter(Boolean) : [];
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const userId = useMemo(
    () => Number(user?.id || user?.user_id || 0),
    [user?.id, user?.user_id]
  );

  useEffect(() => {
    if (!dismissible) {
      setIsVisible(true);
      return;
    }
    if (userId <= 0) {
      setIsVisible(true);
      return;
    }
    const shouldHide =
      isRoleMissionCardPermanentlyHidden(userId) ||
      isRoleMissionCardSessionDismissed(userId);
    setIsVisible(!shouldHide);
  }, [dismissible, userId]);

  if (!isVisible) return null;

  return (
    <DashboardCard className={`${styles.shell} relative`}>
      {dismissible ? (
        <button
          type="button"
          onClick={() => {
            if (userId > 0) {
              setRoleMissionCardSessionDismissed(userId, true);
            }
            setIsVisible(false);
            if (typeof onClose === "function") onClose();
          }}
          className={`absolute -top-3 right-4 z-20 inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${styles.dismissButton}`}
          aria-label="Dismiss mission card"
          title="Dismiss"
        >
          <X size={13} />
          <span>Dismiss</span>
        </button>
      ) : null}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div
              className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
            >
              {Icon ? <Icon size={20} /> : null}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {roleLabel ? (
                  <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-300">
                    {roleLabel}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}
                >
                  {statusLabel}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {safeActions.slice(0, 3).map((action, index) => {
              const variant = action?.variant === "secondary" ? "secondary" : "primary";
              const cls =
                variant === "primary"
                  ? styles.primaryButton
                  : `border bg-white dark:bg-[var(--surface)] ${styles.secondaryButton}`;
              const baseClass = `inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition ${cls}`;
              if (action?.to) {
                return (
                  <Link key={`mission-action-${index}`} to={action.to} className={baseClass}>
                    {action.label}
                  </Link>
                );
              }
              return (
                <button
                  key={`mission-action-${index}`}
                  type="button"
                  className={baseClass}
                  onClick={action?.onClick}
                  disabled={Boolean(action?.disabled)}
                >
                  {action.label}
                </button>
              );
            })}

          </div>
        </div>

      </div>
    </DashboardCard>
  );
};

export default RoleMissionCard;
