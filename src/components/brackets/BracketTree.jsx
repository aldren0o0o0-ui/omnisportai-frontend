import RoundColumn from "./RoundColumn";
import { bracketDensitySettings, resolveDensity } from "./utils/bracketGeometry";

const BracketTree = ({
  rounds,
  selectedMatchId,
  onMatchClick,
  headerTone = "dark",
  connected = true,
  density: forcedDensity = null,
  hasGrandFinal = false,
  bracketRole = null
}) => {
  const firstRoundMatchCount = rounds[0]?.matches?.length || 1;
  const density = forcedDensity || resolveDensity(firstRoundMatchCount);
  const setting = bracketDensitySettings[density] || bracketDensitySettings.regular;
  const columnGap = setting.columnGap;

  return (
    <div className="flex w-max items-start pb-2" style={{ gap: `${columnGap}px` }}>
      {rounds.map((round, index) => (
        <RoundColumn
          key={`${round.round_name}-${index}`}
          round={round}
          roundIndex={index}
          isLastRound={index === rounds.length - 1}
          selectedMatchId={selectedMatchId}
          onMatchClick={onMatchClick}
          density={density}
          headerTone={headerTone}
          connected={connected}
          hasGrandFinal={hasGrandFinal}
          bracketRole={bracketRole}
        />
      ))}
    </div>
  );
};

export default BracketTree;
