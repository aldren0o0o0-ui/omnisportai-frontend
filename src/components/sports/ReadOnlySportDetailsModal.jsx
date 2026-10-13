import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Layers,
  Scale,
  Shield,
  Timer,
  Trophy,
  Users,
  X,
  ChevronRight,
  FileText,
} from "lucide-react";
import { SportIcon } from "../common/IdentityImage";
import { getGlobalSportConfiguration, getSportById } from "../../services/sportService";

const formatMatchTypeLabel = (type) => {
  const key = String(type || "").trim().toLowerCase();
  if (key === "sets" || key === "set_based") return "Set-based";
  if (key === "points" || key === "point_based") return "Points-based";
  if (key === "timed" || key === "time_based") return "Timed match";
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Standard";
};

const formatParticipationLabel = (type) => {
  const key = String(type || "").trim().toLowerCase();
  if (key === "solo" || key === "single" || key === "individual") return "Individual (Solo)";
  if (key === "duo" || key === "double" || key === "pair") return "Pair (Duo)";
  if (key === "mixed_events") return "Individual & Pair";
  return "Team Sport";
};

const formatBracketLabel = (bracket) => {
  const key = String(bracket || "").trim().toUpperCase();
  if (key === "SINGLE_ELIMINATION" || key === "SINGLE_ELIM") return "Single Elimination";
  if (key === "DOUBLE_ELIMINATION" || key === "DOUBLE_ELIM") return "Double Elimination";
  if (key === "ROUND_ROBIN") return "Round Robin";
  return bracket || "Standard Tournament";
};

const formatDivisionLabel = (div) => {
  const key = String(div || "").trim().toUpperCase();
  if (key === "MEN") return "Men's Division";
  if (key === "WOMEN") return "Women's Division";
  if (key === "MIXED") return "Mixed Division";
  if (key === "OPEN") return "Open Division";
  return div || "Open";
};

/**
 * ReadOnlySportDetailsContent: Can be used inside an existing modal or embedded panel.
 */
export const ReadOnlySportDetailsContent = ({ sport: initialSport, sportId, onClose }) => {
  const [sportData, setSportData] = useState(initialSport || null);
  const [templateData, setTemplateData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  const effectiveSportId = sportId || initialSport?.id;

  useEffect(() => {
    if (initialSport) {
      setSportData(initialSport);
    }
  }, [initialSport]);

  useEffect(() => {
    if (!effectiveSportId) return;

    let active = true;
    setLoading(true);

    const promises = [];
    if (!sportData || !sportData.configuration) {
      promises.push(
        getSportById(effectiveSportId)
          .then((res) => {
            if (active && res) setSportData(res);
          })
          .catch(() => {})
      );
    }

    promises.push(
      getGlobalSportConfiguration(effectiveSportId)
        .then((res) => {
          if (active && res) setTemplateData(res);
        })
        .catch(() => {})
    );

    Promise.allSettled(promises).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [effectiveSportId]);

  const sportName =
    sportData?.canonical_display_name ||
    sportData?.sport_name ||
    sportData?.name ||
    templateData?.canonical_display_name ||
    "Sport";

  const config = sportData?.configuration || {};
  const matchConfig = config?.match_config || {};
  const rosterConfig = config?.roster_config || {};

  const minPlayers =
    config?.min_players ??
    rosterConfig?.min_players ??
    sportData?.resolved_team_size?.min ??
    sportData?.resolved_team_size?.exact ??
    1;
  const maxPlayers =
    config?.max_players ??
    rosterConfig?.max_players ??
    sportData?.resolved_team_size?.max ??
    sportData?.resolved_team_size?.exact ??
    minPlayers;
  const substitutesAllowed =
    config?.substitutes_allowed ?? rosterConfig?.substitutes_allowed ?? false;

  const durationMinutes =
    config?.estimated_match_duration_minutes ??
    matchConfig?.estimated_match_duration_minutes ??
    config?.time_limit_minutes ??
    matchConfig?.time_limit_minutes ??
    45;

  const setupBuffer =
    config?.setup_buffer_minutes ?? matchConfig?.setup_buffer_minutes ?? 5;
  const cleanupBuffer =
    config?.cleanup_buffer_minutes ?? matchConfig?.cleanup_buffer_minutes ?? 5;

  const maxSets = config?.max_sets ?? matchConfig?.max_sets ?? null;
  const scoreToWin = config?.score_to_win ?? matchConfig?.score_to_win ?? null;
  const winBy = config?.win_by ?? matchConfig?.win_by ?? null;

  const matchType = config?.match_type ?? matchConfig?.match_type ?? "points";
  const participationType =
    config?.participation_type ??
    config?.unit_type ??
    sportData?.sport_type ??
    "team";

  const events = useMemo(() => {
    if (templateData?.events && Array.isArray(templateData.events)) {
      return templateData.events;
    }
    if (
      sportData?.configuration?.event_config?.events &&
      Array.isArray(sportData.configuration.event_config.events)
    ) {
      return sportData.configuration.event_config.events;
    }
    return [];
  }, [templateData, sportData]);

  return (
    <div className="flex flex-col gap-6 text-[var(--text-main)]">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:p-5">
        <div className="flex items-center gap-4 min-w-0">
          <SportIcon
            imageUrl={sportData?.image_url}
            label={sportName}
            scale="lg"
            className="shrink-0 rounded-2xl shadow-sm"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                {sportName}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {formatParticipationLabel(participationType)}
              </span>
              {sportData?.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-soft)]">
                  {sportData.category}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2">
              {sportData?.description ||
                "Official intramural sport guidelines, roster rules, and competition structure."}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-start sm:self-center shrink-0 rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)] transition"
            aria-label="Close rules"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border-soft)] pb-1 overflow-x-auto">
        {[
          { id: "overview", label: "Rules & Overview", icon: Shield },
          { id: "roster", label: "Roster & Entry", icon: Users },
          { id: "timing", label: "Match & Timing", icon: Clock },
          ...(events.length > 0
            ? [{ id: "categories", label: `Event Divisions (${events.length})`, icon: Layers }]
            : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                isActive
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-main)]"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Rules & Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Format
              </span>
              <p className="mt-1 text-sm sm:text-base font-extrabold text-[var(--text-main)]">
                {formatParticipationLabel(participationType)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Roster Size
              </span>
              <p className="mt-1 text-sm sm:text-base font-extrabold text-[var(--text-main)]">
                {minPlayers === maxPlayers
                  ? `${minPlayers} ${minPlayers === 1 ? "Athlete" : "Players"}`
                  : `${minPlayers}–${maxPlayers} Players`}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Match Duration
              </span>
              <p className="mt-1 text-sm sm:text-base font-extrabold text-[var(--text-main)]">
                ~{durationMinutes} mins
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Scoring Style
              </span>
              <p className="mt-1 text-sm sm:text-base font-extrabold text-[var(--text-main)]">
                {formatMatchTypeLabel(matchType)}
              </p>
            </div>
          </div>

          {/* Official Rule Overview Box */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                Official Sport Governance & Principles
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {sportData?.description ||
                `All matches for ${sportName} are conducted in accordance with official institutional Intramural athletic policies. Facilitators enforce fair play, standard timing limits, and verified entry eligibility.`}
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[var(--text-main)]">Eligibility Verification:</span>
                  <p className="text-[var(--text-muted)] mt-0.5">
                    Athletes must be formally rostered and verified by their department before taking the field.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[var(--text-main)]">Match Scheduling & Punctuality:</span>
                  <p className="text-[var(--text-muted)] mt-0.5">
                    Teams receive {setupBuffer} minutes warmup buffer. Forfeits apply if not present at match time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Standards */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                Standings & Points System
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">WIN</span>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">+3 pts</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">DRAW / TIE</span>
                <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">+1 pt</p>
              </div>
              <div className="rounded-xl bg-slate-500/10 border border-slate-500/20 p-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">LOSS</span>
                <p className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">0 pts</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Points earned contribute directly to overall Department Olympic standings and tournament seeding.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Roster & Entry Requirements */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-main)] flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Roster & Team Composition
            </h3>
            <div className="divide-y divide-[var(--border-soft)]">
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Minimum Athletes Required
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {minPlayers} {minPlayers === 1 ? "athlete" : "players"}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Maximum Athletes Allowed
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {maxPlayers} {maxPlayers === 1 ? "athlete" : "players"}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Substitutes Permitted
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    substitutesAllowed
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {substitutesAllowed ? "Yes, substitutes allowed" : "No substitutes (fixed roster)"}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Entries Allowed Per Department
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {config?.max_entries_per_department || 1} entry per department
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Bracket Tournament Format
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {formatBracketLabel(config?.default_bracket || "SINGLE_ELIMINATION")}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Seeding Policy
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {String(config?.seeding_policy || "RANDOM").toUpperCase() === "RANDOM"
                    ? "Random Draw"
                    : "Ranked Seeding"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Match & Timing */}
      {activeTab === "timing" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-main)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Timing & Match Limits
            </h3>
            <div className="divide-y divide-[var(--border-soft)]">
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Estimated Match Play Duration
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {durationMinutes} minutes
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Pre-Match Setup / Warmup Buffer
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {setupBuffer} minutes
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Post-Match Breakdown / Cleanup Buffer
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {cleanupBuffer} minutes
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                  Total Venue Slot Time
                </span>
                <span className="text-xs sm:text-sm font-bold text-[var(--primary)]">
                  {Number(durationMinutes) + Number(setupBuffer) + Number(cleanupBuffer)} minutes per match
                </span>
              </div>

              {maxSets && (
                <div className="py-3 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                    Maximum Sets / Periods
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                    {maxSets} sets
                  </span>
                </div>
              )}

              {scoreToWin && (
                <div className="py-3 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                    Target Score to Win
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                    {scoreToWin} {winBy ? `(win by ${winBy})` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Event Categories */}
      {activeTab === "categories" && events.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-main)] flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                Configured Event Categories
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {events.length} {events.length === 1 ? "category" : "categories"}
              </span>
            </div>

            <div className="grid gap-3">
              {events.map((evt, idx) => (
                <div
                  key={evt.capability_variant_key || evt.event_name || idx}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[var(--text-main)]">
                        {evt.event_name || evt.system_event_name || "Event Category"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {formatDivisionLabel(evt.division)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {evt.competition_type === "SOLO"
                        ? "1 athlete per entry"
                        : evt.competition_type === "DUO"
                        ? "2 athletes per entry"
                        : `${evt.minimum_players || minPlayers}–${evt.maximum_players || maxPlayers} player team`}
                      {" · "}
                      {formatBracketLabel(evt.bracket_type)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--surface)] px-2.5 py-1 rounded-lg border border-[var(--border-soft)]">
                      Max {evt.entries_per_department || 1} entry/dept
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-soft)] pt-4">
        <span>Sport ID #{effectiveSportId} · Read-only rules preview</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 font-bold text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ReadOnlySportDetailsModal: Full modal overlay with clean backdrop and escape handling.
 */
export const ReadOnlySportDetailsModal = ({ open, onClose, sport, sportId }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-7 text-[var(--text-main)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ReadOnlySportDetailsContent
          sport={sport}
          sportId={sportId || sport?.id}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ReadOnlySportDetailsModal;
