import MatchCard from "./MatchCard";
import { bracketDensitySettings } from "./utils/bracketGeometry";

const RoundColumn = ({
  round,
  roundIndex,
  isLastRound,
  selectedMatchId,
  onMatchClick,
  density = "regular",
  stickyHeader = true,
  headerTone = "dark",
  connected = true,
  hasGrandFinal = false,
  bracketRole = null
}) => {
  const setting = bracketDensitySettings[density] || bracketDensitySettings.regular;
  const { cardHeight, slotHeight, cardWidth } = setting;

  const isChampionship = bracketRole === "grand";
  const isLower = bracketRole === "lower";
  const lowerStage = Math.floor(roundIndex / 2);

  // Geometry:
  // - Winner & Single Elimination: binary tree spacing doubling every round.
  // - Lower Bracket: spacing doubles every 2 rounds (each block of odd + even round).
  // - Championship: single-line flat progression.
  const baseSpacing = slotHeight + setting.baseGap;
  const centerSpacing = isChampionship
    ? slotHeight
    : isLower
      ? baseSpacing * 2 ** lowerStage
      : baseSpacing * 2 ** roundIndex;

  const rowGap = !connected || round.matches.length <= 1
    ? 0
    : centerSpacing - slotHeight;

  const topPadding = !connected || isChampionship
    ? 0
    : isLower
      ? (baseSpacing / 2) * (2 ** lowerStage - 1)
      : roundIndex === 0
        ? 0
        : (baseSpacing / 2) * (2 ** roundIndex - 1);

  const stub = setting.connectorLength;
  const channel = stub * 2;
  const drawConnectors = connected && !isLastRound;
  const drawExitStub = connected && isLastRound && hasGrandFinal;

  // In Lower Bracket, even rounds (R2, R4, R6) converge pairs into next round,
  // whereas odd rounds (R1, R3, R5) feed 1-to-1 into even rounds.
  const isLowerPairConvergence = isLower && roundIndex % 2 === 1;
  const isBinaryPairConvergence = !isLower && !isChampionship;
  const isPairConvergenceRound = (isBinaryPairConvergence || isLowerPairConvergence) && !isLastRound;

  const toneClass = headerTone === "adaptive" ? "text-slate-500 dark:text-slate-400" : "text-slate-400";
  const headerClass = `${stickyHeader ? "sticky top-0 z-10 " : ""}mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] truncate ${toneClass}`;
  const lineClass = "pointer-events-none absolute bg-slate-400 dark:bg-slate-500";

  return (
    <div
      className="relative flex flex-col"
      style={{
        width: `${cardWidth}px`,
        flex: `0 0 ${cardWidth}px`
      }}
    >
      {round.round_name ? <h3 className={headerClass}>{round.round_name}</h3> : null}

      <div className="flex flex-col" style={{ gap: `${rowGap}px`, paddingTop: `${topPadding}px` }}>
        {round.matches.map((match, index) => {
          const hasSibling = index % 2 === 0 && index + 1 < round.matches.length;
          const matchRole =
            bracketRole === "upper" && isLastRound && index === 0
              ? "upper-final"
              : bracketRole === "lower" && isLastRound && index === 0
                ? "lower-final"
                : bracketRole === "grand" && roundIndex === 0 && index === 0
                  ? "grand-final"
                  : bracketRole === "grand" && roundIndex === 1 && index === 0
                    ? "grand-final-reset"
                    : null;

          return (
            <MatchCard
              key={match.id}
              match={match}
              isSelected={selectedMatchId === match.id}
              onClick={() => onMatchClick(match)}
              density={density}
              cardHeight={cardHeight}
              dataBracketRole={matchRole}
            >
              {/* direct horizontal line across full column gap for 1:1 match progression */}
              {drawConnectors && !isPairConvergenceRound && (
                <span
                  className={`${lineClass} top-1/2 h-px -translate-y-1/2`}
                  style={{ right: `-${channel}px`, width: `${channel}px` }}
                />
              )}

              {/* horizontal stub for paired siblings and exit stubs */}
              {drawConnectors && isPairConvergenceRound && (
                <span
                  className={`${lineClass} top-1/2 h-px -translate-y-1/2`}
                  style={{ right: `-${stub}px`, width: `${stub}px` }}
                />
              )}

              {drawExitStub && (
                <span
                  className={`${lineClass} top-1/2 h-px -translate-y-1/2`}
                  style={{ right: `-${stub}px`, width: `${stub}px` }}
                />
              )}

              {/* vertical join across a pair + feed line into the next column */}
              {drawConnectors && isPairConvergenceRound && hasSibling && (
                <>
                  <span
                    className={`${lineClass} top-1/2 w-px`}
                    style={{
                      right: `-${stub}px`,
                      height: `${centerSpacing}px`
                    }}
                  />
                  <span
                    className={`${lineClass} h-px`}
                    style={{
                      right: `-${channel}px`,
                      width: `${stub}px`,
                      top: `calc(50% + ${centerSpacing / 2}px)`
                    }}
                  />
                </>
              )}
            </MatchCard>
          );
        })}
      </div>
    </div>
  );
};

export default RoundColumn;
