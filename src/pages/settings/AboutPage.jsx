import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Info, ShieldCheck, Cpu, Building2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { resolveBackSettingsRoute } from "../../utils/settingsNavigation";

const AboutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames = [] } = useAuth();

  const backSettingsRoute = useMemo(
    () => resolveBackSettingsRoute(location.pathname, roleNames),
    [location.pathname, roleNames]
  );

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="about-page"
    >
      {/* Top Navigation */}
      <div>
        <button
          type="button"
          onClick={() => navigate(backSettingsRoute)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer group"
          data-testid="back-to-settings-button"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to settings</span>
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--border-soft)] pb-4">
        <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
          About OmniSport AI
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Application information and system release details.
        </p>
      </div>

      {/* System Details Section */}
      <section aria-labelledby="about-system-heading">
        <h2
          id="about-system-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
        >
          System information
        </h2>
        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          {/* Version */}
          <div className="py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <Info className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)]">Version</p>
                <p className="text-xs text-[var(--text-muted)]">Production release</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-[var(--text-main)]">
              v1.0.0
            </span>
          </div>

          {/* Platform */}
          <div className="py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <Cpu className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)]">Platform</p>
                <p className="text-xs text-[var(--text-muted)]">Intramural Governance & Live Scoring</p>
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              OmniSport AI
            </span>
          </div>

          {/* Institution */}
          <div className="py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)]">Institution</p>
                <p className="text-xs text-[var(--text-muted)]">Bacolod City College (BCC)</p>
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              Sports Department
            </span>
          </div>

          {/* System Status */}
          <div className="py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)]">Status</p>
                <p className="text-xs text-[var(--text-muted)]">All services operational</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Online
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
