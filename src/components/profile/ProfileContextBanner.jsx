import React from "react";
import { Trophy, Calendar, CheckCircle2, History, ChevronRight } from "lucide-react";

/**
 * ProfileContextBanner
 * Renders the clean workspace row showing the selected intramural.
 * Reads context from global workspace or backend intramural_context.
 */
export const ProfileContextBanner = ({
  intramuralName = "",
  academicYear = null,
  semester = null,
  status = null,
  isHistorical = false,
  isActive = true,
  onClick = null,
}) => {
  if (!intramuralName) return null;

  const content = (
    <div
      className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left group"
      data-testid="profile-context-banner"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--primary)] border border-[var(--border-soft)]">
          {isHistorical ? <History size={16} /> : <Trophy size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-main)] truncate" title={intramuralName}>
            {intramuralName}
          </p>
          {(academicYear || semester) ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate flex items-center gap-1.5">
              <Calendar size={11} className="shrink-0" />
              <span>
                {[academicYear ? `Academic Year ${academicYear}` : null, semester].filter(Boolean).join(" · ")}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
            isHistorical
              ? "border-slate-500/20 bg-slate-500/10 text-slate-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <CheckCircle2 size={10} />
          {isHistorical ? "Historical record" : "Current workspace"}
        </span>
        {onClick ? (
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
        ) : null}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left cursor-pointer">
        {content}
      </button>
    );
  }

  return content;
};

export default ProfileContextBanner;
