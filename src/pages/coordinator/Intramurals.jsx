import { useEffect, useState, useCallback } from "react";
import { Trophy, Layers, ChevronRight, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import {
  getIntramurals,
  getIntramuralCompetitions,
  getCompetition,
  getCompetitionBrackets,
  getCompetitionMatches,
  getCompetitionStandings,
} from "../../services/intramuralService";
import { useWorkspace } from "../../context/WorkspaceContext";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

// Phase 4 (frontend): read-only Intramural Event -> Competition surface.
// Consumes the Phase 3 API. Purely additive — the existing Tournaments page and
// its routes are left untouched. No write actions here.

const card =
  "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--surface)]";
const subtleText = "text-sm text-slate-500 dark:text-slate-400";

function StateBox({ icon: Icon, children }) {
  return (
    <div className={`${card} p-6 flex items-center gap-3 ${subtleText}`}>
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span>{children}</span>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
      {children}
    </span>
  );
}

function CompetitionDetail({ competitionId, onBack }) {
  const [competition, setCompetition] = useState(null);
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, br, mt, st] = await Promise.all([
        getCompetition(competitionId),
        getCompetitionBrackets(competitionId),
        getCompetitionMatches(competitionId),
        getCompetitionStandings(competitionId).catch(() => null),
      ]);
      setCompetition(detail);
      setBrackets(Array.isArray(br) ? br : []);
      setMatches(Array.isArray(mt) ? mt : []);
      setStandings(st);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load competition.");
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <StateBox icon={RefreshCw}>Loading competition...</StateBox>;
  if (error) return <StateBox icon={AlertCircle}>{error}</StateBox>;
  if (!competition) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to competitions
      </button>

      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {competition.name}
          </h2>
          <Badge>{competition.status}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{getSportDisplayName(competition, `Sport #${competition.sport_id}`)}</Badge>
          <Badge>{competition.bracket_count} bracket(s)</Badge>
          <Badge>{competition.match_count} match(es)</Badge>
        </div>
      </div>

      <div className={`${card} p-5`}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Brackets</h3>
        {brackets.length === 0 ? (
          <p className={subtleText}>No brackets yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {brackets.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  {b.format || "—"} · seeding: {b.seeding_method || "—"}
                </span>
                <Badge>{b.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`${card} p-5`}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Matches</h3>
        {matches.length === 0 ? (
          <p className={subtleText}>No matches yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  {m.round || "Match"} #{m.match_number ?? m.id}
                </span>
                <span className="flex items-center gap-2">
                  <span className={subtleText}>
                    {m.score_team1 ?? 0} - {m.score_team2 ?? 0}
                  </span>
                  <Badge>{m.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {standings && Array.isArray(standings.department_rows) && standings.department_rows.length > 0 ? (
        <div className={`${card} p-5`}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Standings</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {standings.department_rows.map((row, idx) => (
              <li key={idx} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  {row.department_name || row.team_name || row.name || `Row ${idx + 1}`}
                </span>
                <span className={subtleText}>{row.points ?? row.wins ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CompetitionList({ intramural, onOpenCompetition, onBack }) {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await getIntramuralCompetitions(intramural.id);
        if (active) setCompetitions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active) setError(err?.response?.data?.detail || "Failed to load competitions.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [intramural.id]);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to intramural events
      </button>

      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{intramural.name}</h2>
        </div>
        <p className={`mt-1 ${subtleText}`}>
          {intramural.competition_count} competition(s)
          {intramural.season_label ? ` · ${intramural.season_label}` : ""}
        </p>
      </div>

      {loading ? (
        <StateBox icon={RefreshCw}>Loading competitions...</StateBox>
      ) : error ? (
        <StateBox icon={AlertCircle}>{error}</StateBox>
      ) : competitions.length === 0 ? (
        <StateBox icon={Layers}>No competitions in this intramural event yet.</StateBox>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {competitions.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenCompetition(c.id)}
              className={`${card} p-4 text-left transition hover:border-slate-300 dark:hover:border-slate-600`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{getSportDisplayName(c, `Sport #${c.sport_id}`)}</Badge>
                <Badge>{c.bracket_count} bracket(s)</Badge>
                <Badge>{c.match_count} match(es)</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Intramurals() {
  const { selectIntramural } = useWorkspace();
  const [intramurals, setIntramurals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openedIntramural, setOpenedIntramural] = useState(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getIntramurals();
      setIntramurals(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load intramural events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openIntramural = useCallback(
    (intramural) => {
      selectIntramural(intramural);
      setOpenedIntramural(intramural);
      setSelectedCompetitionId(null);
    },
    [selectIntramural]
  );

  return (
    <div className="os-themed-page my-6 space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Intramural Events</h1>
          <p className={subtleText}>Event-level overview and per-sport competitions.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {selectedCompetitionId != null ? (
        <CompetitionDetail
          competitionId={selectedCompetitionId}
          onBack={() => setSelectedCompetitionId(null)}
        />
      ) : openedIntramural ? (
        <CompetitionList
          intramural={openedIntramural}
          onOpenCompetition={setSelectedCompetitionId}
          onBack={() => setOpenedIntramural(null)}
        />
      ) : loading ? (
        <StateBox icon={RefreshCw}>Loading intramural events...</StateBox>
      ) : error ? (
        <StateBox icon={AlertCircle}>{error}</StateBox>
      ) : intramurals.length === 0 ? (
        <StateBox icon={Trophy}>No intramural events found.</StateBox>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {intramurals.map((im) => (
            <button
              key={im.id}
              onClick={() => openIntramural(im)}
              className={`${card} p-4 text-left transition hover:border-slate-300 dark:hover:border-slate-600`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-100">{im.name}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{im.competition_count} competition(s)</Badge>
                {im.is_archived ? <Badge>archived</Badge> : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
