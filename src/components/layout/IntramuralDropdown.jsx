import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Trophy } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import useIntramuralList from "../../hooks/useIntramuralList";
import IntramuralStatusBadge from "../intramural/IntramuralStatusBadge";
import { semesterLabel } from "../intramural/intramuralStatus";
import {
  broadcastDashboardTournamentSelection,
  readStoredDashboardTournamentSelection,
  writeStoredDashboardTournamentSelection,
} from "../../utils/dashboardTournamentSelection";

const IntramuralDropdown = () => {
  const { selectedIntramural, workspace: activeIntramural, selectIntramural } =
    useWorkspace();
  const { intramurals, tournamentByWorkspace, loading } = useIntramuralList();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const viewing = selectedIntramural || activeIntramural || null;

  useEffect(() => {
    if (!viewing?.id) return;
    const tournament = tournamentByWorkspace[Number(viewing.id)];
    if (!tournament?.id) return;
    const stored = readStoredDashboardTournamentSelection();
    if (!stored?.id) {
      writeStoredDashboardTournamentSelection({
        id: String(tournament.id),
        name: viewing.name || tournament.tournament_name || "",
      });
    }
  }, [viewing?.id, viewing?.name, tournamentByWorkspace]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelect = useCallback(
    (chosen) => {
      const isAlreadySelected = chosen && viewing && Number(chosen.id) === Number(viewing.id);
      const target = isAlreadySelected ? null : chosen;
      selectIntramural(target);
      const tournament = target
        ? tournamentByWorkspace[Number(target.id)]
        : null;
      const payload = tournament
        ? {
            id: String(tournament.id),
            name: target?.name || tournament.tournament_name || "",
          }
        : { id: "", name: target?.name || "" };
      writeStoredDashboardTournamentSelection(payload);
      broadcastDashboardTournamentSelection({
        ...payload,
        source: "topbar",
      });
      setOpen(false);
      triggerRef.current?.focus();
    },
    [selectIntramural, tournamentByWorkspace, viewing]
  );

  const sortedIntramurals = useMemo(() => {
    if (!Array.isArray(intramurals)) return [];
    return [...intramurals].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return Number(b.id) - Number(a.id);
    });
  }, [intramurals]);

  const activeCount = useMemo(() => {
    return sortedIntramurals.filter((item) => item.is_active).length;
  }, [sortedIntramurals]);

  const displayedIntramurals = useMemo(() => {
    if (filter === "active") {
      return sortedIntramurals.filter((item) => item.is_active);
    }
    return sortedIntramurals;
  }, [sortedIntramurals, filter]);

  return (
    <div className="os-intramural-dropdown-wrap relative">
      <button
        ref={triggerRef}
        type="button"
        className={`relative flex h-10 items-center gap-2.5 rounded-xl border px-3 sm:px-3.5 transition active:scale-95 shrink-0 cursor-pointer max-w-[240px] sm:max-w-[340px] ${
          open
            ? "border-blue-300 bg-blue-50/80 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400 shadow-xs"
            : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-soft)] shadow-xs"
        }`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select intramural"
      >
        <div
          className={`grid h-6 w-6 place-items-center rounded-lg shrink-0 transition ${
            open
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <Trophy size={13} aria-hidden="true" />
        </div>

        {loading ? (
          <span className="truncate text-xs font-semibold text-[var(--text-muted)]">Loading…</span>
        ) : viewing ? (
          <div className="flex min-w-0 items-center gap-2 truncate">
            <span className="truncate text-xs sm:text-[13px] font-bold text-[var(--text-main)]" title={viewing.name}>
              {viewing.name}
            </span>
            <span className="hidden md:inline-flex shrink-0">
              <IntramuralStatusBadge status={viewing.status} />
            </span>
          </div>
        ) : (
          <span className="truncate text-xs font-semibold text-[var(--text-muted)]">Select Intramural</span>
        )}

        <ChevronDown
          size={14}
          className={`ml-auto shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
            open ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={popoverRef}
            className="fixed top-14 left-2 right-2 z-50 sm:absolute sm:top-[calc(100%+8px)] sm:left-0 sm:right-auto sm:w-[420px] sm:max-w-[calc(100vw-20px)] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[var(--surface)] shadow-2xl backdrop-blur-md p-3.5"
            role="listbox"
            aria-label="Intramural list"
          >
            {/* Header: Title & Count */}
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Intramurals
                </h2>
                {sortedIntramurals.length > 0 ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white leading-none">
                    {sortedIntramurals.length}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                {viewing ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(null)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition cursor-pointer"
                    title="Clear selected intramural"
                  >
                    Deselect
                  </button>
                ) : null}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {sortedIntramurals.length} available
                </span>
              </div>
            </div>

            {/* Filter Pills: All / Active */}
            <div className="flex items-center gap-2 px-1 pb-3 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer ${
                  filter === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer ${
                  filter === "active"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
                onClick={() => setFilter("active")}
              >
                Active{activeCount > 0 ? ` (${activeCount})` : ""}
              </button>
            </div>

            {/* Items list */}
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading intramurals...
              </div>
            ) : displayedIntramurals.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <Trophy size={22} />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {filter === "active" ? "No active intramurals" : "No intramurals available"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {filter === "active"
                    ? "No intramural is currently marked active."
                    : "Intramural tournaments will appear here."}
                </p>
              </div>
            ) : (
              <div className="mt-2 max-h-[380px] space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
                {displayedIntramurals.map((row) => {
                  const isSelected = Number(viewing?.id) === Number(row.id);
                  const isActive = row.is_active;

                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(row)}
                      className={`group relative flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-100/90 dark:hover:bg-slate-800/80 cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500/30"
                          : ""
                      }`}
                    >
                      {/* Avatar with corner active badge */}
                      <div className="relative shrink-0">
                        <div
                          className={`grid h-11 w-11 place-items-center rounded-full font-bold text-sm transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <Trophy size={20} />
                        </div>
                        {isActive ? (
                          <span
                            className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[10px] bg-emerald-500 text-white ring-2 ring-white dark:ring-[var(--surface)]"
                            title="Active Intramural"
                          >
                            <Check size={11} strokeWidth={3} />
                          </span>
                        ) : null}
                      </div>

                      {/* Intramural Details */}
                      <div className="min-w-0 flex-1 pr-1">
                        <div className="text-[13px] leading-snug">
                          <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                            {row.name}
                          </span>
                          {isActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 align-middle">
                              Active
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <IntramuralStatusBadge status={row.status} />
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <CalendarDays size={11} aria-hidden="true" />
                            {row.school_year}
                            {row.semester ? ` · ${semesterLabel(row.semester)}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Right-hand checkmark or indicator */}
                      {isSelected ? (
                        <div className="self-center pr-1 shrink-0">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white shadow-xs ring-2 ring-blue-100 dark:ring-blue-900">
                            <Check size={13} strokeWidth={2.5} />
                          </span>
                        </div>
                      ) : (
                        <div className="self-center pr-1 shrink-0 opacity-0 group-hover:opacity-40 transition">
                          <span className="block h-2 w-2 rounded-full bg-slate-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default IntramuralDropdown;
