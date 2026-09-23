import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import useIntramuralList from "../../hooks/useIntramuralList";
import IntramuralStatusBadge from "../intramural/IntramuralStatusBadge";
import { semesterLabel } from "../intramural/intramuralStatus";
import {
  broadcastDashboardTournamentSelection,
  writeStoredDashboardTournamentSelection,
} from "../../utils/dashboardTournamentSelection";

const IntramuralDropdown = () => {
  const { selectedIntramural, workspace: activeIntramural, selectIntramural } =
    useWorkspace();
  const { intramurals, tournamentByWorkspace, loading } = useIntramuralList();

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const viewing = selectedIntramural || activeIntramural || null;

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
      selectIntramural(chosen);
      const tournament = chosen
        ? tournamentByWorkspace[Number(chosen.id)]
        : null;
      const payload = tournament
        ? {
            id: String(tournament.id),
            name: chosen?.name || tournament.tournament_name || "",
          }
        : { id: "", name: chosen?.name || "" };
      writeStoredDashboardTournamentSelection(payload);
      broadcastDashboardTournamentSelection({
        ...payload,
        source: "topbar",
      });
      setOpen(false);
      triggerRef.current?.focus();
    },
    [selectIntramural, tournamentByWorkspace]
  );

  const sortedIntramurals = useMemo(() => {
    if (!Array.isArray(intramurals)) return [];
    return [...intramurals].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return Number(b.id) - Number(a.id);
    });
  }, [intramurals]);

  return (
    <div className="os-intramural-dropdown-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="os-intramural-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select intramural"
      >
        {loading ? (
          <span className="os-intramural-trigger-name">Loading…</span>
        ) : viewing ? (
          <>
            <span className="os-intramural-trigger-name" title={viewing.name}>{viewing.name}</span>
            <span className="os-intramural-trigger-detail hidden sm:inline-flex">
              <IntramuralStatusBadge status={viewing.status} />
            </span>
          </>
        ) : (
          <span className="os-intramural-trigger-name">No intramural</span>
        )}
        <ChevronDown
          size={14}
          className={`os-intramural-trigger-chevron ${open ? "open" : ""}`}
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
            className="os-popover os-intramural-popover fixed top-14 left-2.5 right-2.5 z-50 sm:absolute sm:top-[calc(100%+6px)] sm:left-0 sm:right-auto sm:w-[340px] sm:max-w-[calc(100vw-24px)] shadow-xl p-2"
            role="listbox"
            aria-label="Intramural list"
          >
            <div className="px-2.5 py-2 mb-1 border-b border-[var(--border-soft)] flex items-center justify-between sm:hidden">
              <span className="text-xs font-bold text-[var(--text-main)]">Select Intramural</span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">{sortedIntramurals.length} available</span>
            </div>
            {sortedIntramurals.length === 0 ? (
              <div className="os-intramural-empty">No intramurals available</div>
            ) : (
              <div className="space-y-1 max-h-[60vh] sm:max-h-[380px] overflow-y-auto overscroll-contain">
                {sortedIntramurals.map((row) => {
                  const isSelected = Number(viewing?.id) === Number(row.id);
                  const isActive = row.is_active;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`os-intramural-option ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelect(row)}
                    >
                      <div className="os-intramural-option-top">
                        <span className="os-intramural-option-name">
                          {row.name}
                          {isActive ? (
                            <span className="os-intramural-active-label">
                              (Active)
                            </span>
                          ) : null}
                        </span>
                        {isSelected ? (
                          <Check
                            size={14}
                            className="os-intramural-option-check"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                      <div className="os-intramural-option-meta">
                        <IntramuralStatusBadge status={row.status} />
                        <span className="os-intramural-option-year">
                          <CalendarDays size={11} aria-hidden="true" />
                          {row.school_year}
                          {row.semester
                            ? ` · ${semesterLabel(row.semester)}`
                            : ""}
                        </span>
                      </div>
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
