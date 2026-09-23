import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { SportIcon, TeamLogo } from "../common/IdentityImage";
import TeamDetailsDrawer from "./TeamDetailsDrawer";
import { useAuth } from "../../context/AuthContext";

const CompetitionShowcase = ({
  sports = [],
  entries = [],
  entriesHref = "/coordinator/teams",
  userDepartmentId = null,
  userDepartmentCode = null,
  tournamentId = null,
}) => {
  const [view, setView] = useState("sports");
  const [selectedDrawerEntry, setSelectedDrawerEntry] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef(null);
  const { user } = useAuth();

  const effectiveDeptId = userDepartmentId ?? user?.department_id ?? null;
  const effectiveDeptCode = (userDepartmentCode ?? user?.department_code ?? user?.department_name ?? "").trim().toUpperCase();

  const isMyDepartment = (item) => {
    if (!item) return false;
    if (item.isMyDepartment) return true;
    if (effectiveDeptId && Number(item.department_id) === Number(effectiveDeptId)) return true;
    if (effectiveDeptCode) {
      const itemCode = String(item.department_code || item.department_name || "").trim().toUpperCase();
      if (itemCode && (itemCode === effectiveDeptCode || itemCode.includes(effectiveDeptCode) || effectiveDeptCode.includes(itemCode))) {
        return true;
      }
    }
    return false;
  };

  const items = view === "sports" ? sports : entries;

  // Determine if we need the marquee (items overflow the container)
  const [needsMarquee, setNeedsMarquee] = useState(false);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Measure only the first set of items (half of children if duplicated)
    const measure = () => {
      const singleSetWidth = Array.from(track.children)
        .slice(0, items.length)
        .reduce((sum, child) => sum + child.offsetWidth, 0);
      const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
      const totalWidth = singleSetWidth + gap * Math.max(0, items.length - 1);
      setNeedsMarquee(totalWidth > track.parentElement.clientWidth + 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track.parentElement);
    return () => observer.disconnect();
  }, [items, view]);

  // Calculate the animation duration based on content width for consistent speed
  const [animDuration, setAnimDuration] = useState(30);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !needsMarquee) return;
    const singleSetWidth = Array.from(track.children)
      .slice(0, items.length)
      .reduce((sum, child) => sum + child.offsetWidth, 0);
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const totalWidth = singleSetWidth + gap * items.length;
    // ~30px per second → slow, gentle scroll
    const duration = Math.max(15, totalWidth / 30);
    setAnimDuration(duration);
  }, [items, needsMarquee, view]);

  // Render a single card
  const renderCard = useCallback((item, index, setPrefix = "") => {
    const isMine = view === "entries" && isMyDepartment(item);
    const key = `${setPrefix}${view}-${item.id || item.name}-${index}`;

    if (view === "entries") {
      return (
        <button
          key={key}
          type="button"
          onClick={() => setSelectedDrawerEntry(item)}
          className="group w-[260px] xs:w-[280px] sm:w-[320px] max-w-[85vw] min-w-0 shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-2xl"
        >
          <div className={`flex h-full items-center gap-3 rounded-2xl p-3 sm:p-3.5 transition duration-200 group-hover:-translate-y-0.5 group-hover:opacity-80 ${
            isMine ? "" : ""
          }`}>
            {/* Highlighted Blue Ring for User's Department */}
            <div className={`relative shrink-0 rounded-2xl transition ${
              isMine ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--surface)] shadow-md" : ""
            }`}>
              <TeamLogo imageUrl={item.imageUrl} label={item.name} scale="md" />
              {isMine && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-extrabold text-white shadow"
                  title="Your Department"
                >
                  ★
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs sm:text-sm font-bold leading-snug text-[var(--text-main)] group-hover:text-[var(--primary)]">
                  {item.name}
                </p>
                {isMine && (
                  <span className="shrink-0 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    My Dept
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] sm:text-xs leading-relaxed text-[var(--text-muted)]">
                {item.meta || "Competition entry"}
              </p>
            </div>

            <div className="shrink-0 text-[var(--text-soft)] transition group-hover:text-[var(--primary)] group-hover:translate-x-0.5">
              <Info size={16} />
            </div>
          </div>
        </button>
      );
    }

    // Sports Tab
    return (
      <div
        key={key}
        className="w-[240px] xs:w-[260px] sm:w-[290px] max-w-[85vw] min-w-0 shrink-0"
      >
        <div className="flex h-full items-center gap-3 rounded-2xl p-3 sm:p-3.5 transition-transform hover:-translate-y-0.5 hover:opacity-80">
          <SportIcon imageUrl={item.imageUrl} label={item.name} scale="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-sm font-bold leading-snug text-[var(--text-main)]">
              {item.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] sm:text-xs leading-relaxed text-[var(--text-muted)]">
              {item.meta || "Official sport"}
            </p>
          </div>
        </div>
      </div>
    );
  }, [view, effectiveDeptId, effectiveDeptCode]);

  return (
    <section className="my-8 w-full min-w-0 max-w-full overflow-hidden py-2" aria-labelledby="competition-showcase-title">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="competition-showcase-title" className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-[var(--text-main)]">
            Intramural Competition
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Browse configured sports or registered teams and entries. Click any team or entry to inspect full roster details.
          </p>
        </div>
        <div className="flex w-full sm:w-auto rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-1 shrink-0" role="tablist" aria-label="Competition showcase view">
          {[["sports", "Sports"], ["entries", "Teams & Entries"]].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={`flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                view === value
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          {view === "sports"
            ? "No sports configured for this intramural yet."
            : "No teams or competition entries are registered yet."}
        </div>
      ) : (
        <div
          className="relative mt-4 w-full min-w-0 max-w-full overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* CSS marquee track */}
          <div
            ref={trackRef}
            className="flex gap-3 sm:gap-4 py-4 pb-5 will-change-transform"
            style={
              needsMarquee
                ? {
                    animation: `marquee-scroll ${animDuration}s linear infinite`,
                    animationPlayState: isHovered ? "paused" : "running",
                    width: "max-content",
                  }
                : { justifyContent: "center", width: "100%" }
            }
            aria-live="polite"
          >
            {/* Original set */}
            {items.map((item, index) => renderCard(item, index, "a-"))}

            {/* Duplicate set for seamless infinite loop */}
            {needsMarquee && items.map((item, index) => renderCard(item, index, "b-"))}
          </div>

          {/* Soft edge fades for polish */}
          {needsMarquee && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--surface)] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--surface)] to-transparent" />
            </>
          )}
        </div>
      )}

      {/* Team / Entry Detail Full-Page Blur Drawer */}
      <TeamDetailsDrawer
        isOpen={Boolean(selectedDrawerEntry)}
        onClose={() => setSelectedDrawerEntry(null)}
        entry={selectedDrawerEntry}
        tournamentId={tournamentId}
        isMyDepartment={isMyDepartment(selectedDrawerEntry)}
        viewHref={entriesHref}
      />
    </section>
  );
};

export default CompetitionShowcase;
