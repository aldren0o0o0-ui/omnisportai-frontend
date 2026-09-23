import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { MoveHorizontal } from "lucide-react";
import BracketTree from "./BracketTree";
import MatchDetailsPanel from "./MatchDetailsPanel";
import RoundColumn from "./RoundColumn";
import { bracketDensitySettings, resolveDensity } from "./utils/bracketGeometry";
import {
  getMatchParticipantLabel,
  getMatchParticipantTarget,
} from "./utils/bracketTargets";

const completedStatuses = new Set(["COMPLETED", "BYE", "CANCELED", "CANCELLED", "ABANDONED"]);
const ongoingStatuses = new Set(["ONGOING"]);

const normalizeBracketSide = (sideValue, roundLabel) => {
  const side = String(sideValue || "").toUpperCase();
  if (side) return side;

  const label = String(roundLabel || "").toUpperCase();
  if (label.includes("GRAND FINAL")) return "GRAND_FINAL";
  if (label.includes("LOWER") || label.includes("LOSER")) return "LOSER";
  if (label.includes("UPPER") || label.includes("WINNER")) return "WINNER";
  return "UNKNOWN";
};

const isGrandFinalSide = (side) => side.startsWith("GRAND_FINAL");
const isLoserSide = (side) => side === "LOSER";

const normalizeStatus = (rawStatus) => {
  const status = String(rawStatus || "").toUpperCase();
  if (completedStatuses.has(status)) {
    return { category: "completed", label: "Completed" };
  }
  if (ongoingStatuses.has(status)) {
    return { category: "ongoing", label: "Ongoing" };
  }
  return { category: "upcoming", label: "Upcoming" };
};

const toTimeText = (value) => {
  if (!value) return null;
  const text = String(value);
  if (text.includes(":")) {
    return text.slice(0, 5);
  }
  return text;
};

const buildScheduleLabel = (match) => {
  if (match?.schedule_label) return String(match.schedule_label);
  if (match?.scheduled_at) return String(match.scheduled_at);

  const dateText = match?.match_date ? String(match.match_date) : null;
  const startText = toTimeText(match?.start_time);
  const endText = toTimeText(match?.end_time);
  const venueText = match?.venue_name ? String(match.venue_name) : null;

  let label = null;
  if (dateText && startText && endText) label = `${dateText} ${startText}-${endText}`;
  else if (dateText && startText) label = `${dateText} ${startText}`;
  else if (dateText) label = dateText;

  if (label && venueText) return `${label} @ ${venueText}`;
  return label;
};

const cleanParticipantName = (rawName) => {
  if (!rawName) return rawName;
  const str = String(rawName).trim();
  const parts = str.split(/\s+-\s+/);
  if (parts.length >= 2 && parts[0].trim().length > 0) {
    return parts[0].trim();
  }
  return str;
};

const mapMatch = (match) => {
  const statusInfo = normalizeStatus(match.status);
  const participant1Target = getMatchParticipantTarget(match, 1);
  const participant2Target = getMatchParticipantTarget(match, 2);
  const team1Name = getMatchParticipantLabel(match, 1);
  const team2Name = getMatchParticipantLabel(match, 2);
  const team1Winner = Boolean(
    (match.winner_team_id && match.team1_id && match.winner_team_id === match.team1_id)
    || (match.winner_entry_id && match.entry1_id && match.winner_entry_id === match.entry1_id)
  );
  const team2Winner = Boolean(
    (match.winner_team_id && match.team2_id && match.winner_team_id === match.team2_id)
    || (match.winner_entry_id && match.entry2_id && match.winner_entry_id === match.entry2_id)
  );
  const winnerName = team1Winner ? team1Name : team2Winner ? team2Name : null;
  const roundLabel = match.round || `Round ${match.round_number || 1}`;
  const sideNormalized = normalizeBracketSide(match.bracket_side || match.bracket_segment, roundLabel);

  return {
    id: match.id,
    roundNumber: Number(match.round_number || 1),
    roundLabel,
    matchNumber: match.match_number || match.id,
    bracketSide: match.bracket_side || match.bracket_segment || "N/A",
    sideNormalized,
    isGrandFinal: isGrandFinalSide(sideNormalized),
    statusCategory: statusInfo.category,
    statusLabel: statusInfo.label,
    scheduledAt: buildScheduleLabel(match),
    venueName: match.venue_name || null,
    team1: {
      id: participant1Target?.id || null,
      name: team1Name,
      displayName: cleanParticipantName(team1Name),
      logoUrl: match.participant1?.effective_logo_url || match.team1_logo_url || match.unitA_logo_url || null,
      score: Number(match.score_team1 ?? 0),
      isWinner: team1Winner
    },
    team2: {
      id: participant2Target?.id || null,
      name: team2Name,
      displayName: cleanParticipantName(team2Name),
      logoUrl: match.participant2?.effective_logo_url || match.team2_logo_url || match.unitB_logo_url || null,
      score: Number(match.score_team2 ?? 0),
      isWinner: team2Winner
    },
    winnerName,
    raw: match
  };
};

const toRoundGroups = (matches) => {
  const roundMap = new Map();
  matches
    .slice()
    .sort((a, b) => {
      if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    })
    .forEach((match) => {
      const key = `${match.roundNumber}-${match.roundLabel}`;
      if (!roundMap.has(key)) {
        roundMap.set(key, {
          round_name: match.roundLabel,
          round_number: match.roundNumber,
          matches: []
        });
      }
      roundMap.get(key).matches.push(match);
    });

  return Array.from(roundMap.values()).sort((a, b) => a.round_number - b.round_number);
};

const ModernBracketView = ({ matches, format, variant = "default", onViewMatchScore = null }) => {
  const mappedMatches = useMemo(() => (matches || []).map(mapMatch), [matches]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const doubleCanvasRef = useRef(null);
  const [convergenceCoords, setConvergenceCoords] = useState(null);

  const selectedMatch = useMemo(
    () => mappedMatches.find((match) => match.id === selectedMatchId) || null,
    [mappedMatches, selectedMatchId]
  );

  const singleRounds = useMemo(() => toRoundGroups(mappedMatches), [mappedMatches]);
  const grandFinalMatches = useMemo(() => mappedMatches.filter((match) => isGrandFinalSide(match.sideNormalized)), [mappedMatches]);
  const winnerRounds = useMemo(
    () =>
      toRoundGroups(
        mappedMatches.filter((match) => !isGrandFinalSide(match.sideNormalized) && !isLoserSide(match.sideNormalized))
      ),
    [mappedMatches]
  );
  const loserRounds = useMemo(
    () => toRoundGroups(mappedMatches.filter((match) => isLoserSide(match.sideNormalized))),
    [mappedMatches]
  );
  const grandFinalRounds = useMemo(
    () => toRoundGroups(grandFinalMatches),
    [grandFinalMatches]
  );
  const hasGrandFinal = grandFinalRounds.length > 0;
  const isDouble = format === "double_elimination";
  const isRoundRobin = String(format || "").toLowerCase() === "round_robin";

  const doubleDensity = useMemo(() => {
    const firstUpper = winnerRounds[0]?.matches?.length || 0;
    const firstLower = loserRounds[0]?.matches?.length || 0;
    return resolveDensity(Math.max(firstUpper, firstLower));
  }, [winnerRounds, loserRounds]);

  const geo = bracketDensitySettings[doubleDensity] || bracketDensitySettings.regular;
  const doubleColumnGap = geo.columnGap;
  const sectionGap = geo.sectionGap || 24;

  // Deterministic, steady Championship top position (aligned with Round 2 center on initial paint)
  const championshipMarginTop = useMemo(() => {
    if (!isDouble || !hasGrandFinal) return 0;
    const upperFirstRoundCount = winnerRounds[0]?.matches?.length || 1;
    const upperTotalHeight =
      upperFirstRoundCount * geo.slotHeight +
      Math.max(0, upperFirstRoundCount - 1) * geo.baseGap +
      24; // Upper heading + gap

    const upperRoundsCount = winnerRounds.length;
    const upperFinalTopPadding =
      upperRoundsCount <= 1
        ? 0
        : ((geo.slotHeight + geo.baseGap) / 2) * (2 ** (upperRoundsCount - 1) - 1);
    const upperFinalCenterY = 24 + upperFinalTopPadding + geo.labelHeight + geo.labelGap + geo.cardHeight / 2;

    const lowerFinalCenterY =
      upperTotalHeight + sectionGap + 24 + geo.labelHeight + geo.labelGap + geo.cardHeight / 2;

    const targetMidY = (upperFinalCenterY + lowerFinalCenterY) / 2;
    const grandCenterInChampionship = 24 + 24 + geo.labelHeight + geo.labelGap + geo.cardHeight / 2;

    return Math.max(0, targetMidY - grandCenterInChampionship);
  }, [isDouble, hasGrandFinal, winnerRounds, geo, sectionGap]);

  // Measure card anchors and draw SVG connectors without layout shift
  useLayoutEffect(() => {
    if (!isDouble || !hasGrandFinal || !doubleCanvasRef.current) return;

    const computeConvergence = () => {
      const canvas = doubleCanvasRef.current;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const upperFinal = canvas.querySelector('[data-bracket-anchor="upper-final"]');
      const lowerFinal = canvas.querySelector('[data-bracket-anchor="lower-final"]');
      const grandFinal = canvas.querySelector('[data-bracket-anchor="grand-final"]');
      const grandReset = canvas.querySelector('[data-bracket-anchor="grand-final-reset"]');

      if (upperFinal && lowerFinal && grandFinal) {
        const upperRect = upperFinal.getBoundingClientRect();
        const lowerRect = lowerFinal.getBoundingClientRect();
        const grandRect = grandFinal.getBoundingClientRect();
        const resetRect = grandReset ? grandReset.getBoundingClientRect() : null;

        const upperCenterY = upperRect.top + upperRect.height / 2 - canvasRect.top;
        const lowerCenterY = lowerRect.top + lowerRect.height / 2 - canvasRect.top;
        const grandCenterY = grandRect.top + grandRect.height / 2 - canvasRect.top;

        const x1 = upperRect.right - canvasRect.left;
        const x2 = grandRect.left - canvasRect.left;
        const xMid = x1 + (x2 - x1) / 2;

        setConvergenceCoords({
          upperCenterY,
          lowerCenterY,
          grandCenterY,
          resetCenterY: resetRect ? resetRect.top + resetRect.height / 2 - canvasRect.top : grandCenterY,
          x1,
          x2,
          xMid,
          grandRight: grandRect.right - canvasRect.left,
          resetLeft: resetRect ? resetRect.left - canvasRect.left : null
        });
      }
    };

    computeConvergence();
    const observer = new ResizeObserver(computeConvergence);
    observer.observe(doubleCanvasRef.current);
    return () => observer.disconnect();
  }, [isDouble, hasGrandFinal, winnerRounds, loserRounds, grandFinalRounds, doubleDensity, geo, championshipMarginTop]);

  const isEmbedded = String(variant || "").toLowerCase() === "embedded";
  const shellClass = isEmbedded
    ? "rounded-xl bg-transparent p-1"
    : "rounded-xl bg-transparent p-1 sm:p-2";
  const emptyColumnClass = isEmbedded
    ? "rounded-lg border border-dashed border-slate-300 bg-slate-100/70 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-500"
    : "rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-xs text-slate-500";
  const openDetails = (match) => {
    setSelectedMatchId(match.id);
    setIsDetailsOpen(true);
  };
  const closeDetails = () => {
    setIsDetailsOpen(false);
  };
  const headerTone = isEmbedded ? "adaptive" : "dark";

  return (
    <div className="space-y-4">
      <div className={shellClass}>
        <div className="flex items-center justify-between px-2 pb-2 md:hidden">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <MoveHorizontal size={14} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
            <span>Swipe horizontally to navigate rounds</span>
          </div>
        </div>
        <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
          <div className="flex min-h-[20rem] min-w-max items-start px-2 py-4 sm:min-h-[24rem] sm:px-6 sm:py-8">
            {!isDouble && (
              <BracketTree
                rounds={singleRounds}
                selectedMatchId={selectedMatchId}
                onMatchClick={openDetails}
                headerTone={headerTone}
                connected={!isRoundRobin}
              />
            )}

            {isDouble && (
              <div
                ref={doubleCanvasRef}
                className="relative flex w-max items-start"
                style={{ gap: `${doubleColumnGap}px` }}
              >
                {/* Real-coordinate SVG convergence connector overlay */}
                {convergenceCoords && (
                  <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                    {/* Upper Final horizontal exit stub */}
                    <path
                      d={`M ${convergenceCoords.x1} ${convergenceCoords.upperCenterY} H ${convergenceCoords.xMid}`}
                      className="stroke-slate-400 dark:stroke-slate-400"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Lower Final horizontal exit stub */}
                    <path
                      d={`M ${convergenceCoords.x1} ${convergenceCoords.lowerCenterY} H ${convergenceCoords.xMid}`}
                      className="stroke-slate-400 dark:stroke-slate-400"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Vertical convergence join line spanning Upper Final to Lower Final */}
                    <path
                      d={`M ${convergenceCoords.xMid} ${convergenceCoords.upperCenterY} V ${convergenceCoords.lowerCenterY}`}
                      className="stroke-slate-400 dark:stroke-slate-400"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Center feeder line entering Grand Final */}
                    <path
                      d={`M ${convergenceCoords.xMid} ${convergenceCoords.grandCenterY} H ${convergenceCoords.x2}`}
                      className="stroke-slate-400 dark:stroke-slate-400"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Direct horizontal line from Grand Final to Reset */}
                    {convergenceCoords.resetLeft && (
                      <path
                        d={`M ${convergenceCoords.grandRight} ${convergenceCoords.grandCenterY} H ${convergenceCoords.resetLeft}`}
                        className="stroke-slate-400 dark:stroke-slate-400"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    )}
                  </svg>
                )}

                {/* Left Track: Upper & Lower Progression Trees */}
                <div className="flex flex-col" style={{ gap: `${sectionGap}px` }}>
                  {/* Upper Bracket Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Upper Bracket
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Winners
                      </span>
                    </div>
                    {winnerRounds.length > 0 ? (
                      <BracketTree
                        rounds={winnerRounds}
                        selectedMatchId={selectedMatchId}
                        onMatchClick={openDetails}
                        headerTone={headerTone}
                        density={doubleDensity}
                        hasGrandFinal={false}
                        bracketRole="upper"
                      />
                    ) : (
                      <div className={emptyColumnClass}>No upper rounds generated yet.</div>
                    )}
                  </div>

                  {/* Lower Bracket Section */}
                  {loserRounds.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Lower Bracket
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Elimination
                        </span>
                      </div>
                      <BracketTree
                        rounds={loserRounds}
                        selectedMatchId={selectedMatchId}
                        onMatchClick={openDetails}
                        headerTone={headerTone}
                        density={doubleDensity}
                        hasGrandFinal={false}
                        bracketRole="lower"
                      />
                    </div>
                  )}
                </div>

                {/* Right Track: Championship (Grand Final & Reset) */}
                {hasGrandFinal && (
                  <div
                    className="relative flex flex-col space-y-1.5"
                    style={{ marginTop: `${championshipMarginTop}px` }}
                  >
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Championship
                      </span>
                    </div>
                    <BracketTree
                      rounds={grandFinalRounds}
                      selectedMatchId={selectedMatchId}
                      onMatchClick={openDetails}
                      headerTone={headerTone}
                      density={doubleDensity}
                      bracketRole="grand"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <MatchDetailsPanel
        match={selectedMatch}
        isOpen={isDetailsOpen && Boolean(selectedMatch)}
        onClose={closeDetails}
        onViewScore={onViewMatchScore}
      />
    </div>
  );
};

export default ModernBracketView;
