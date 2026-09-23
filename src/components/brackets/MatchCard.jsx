import { useState } from 'react';
import { initialsFromLabel, resolveMediaUrl } from "../../utils/media";
import { bracketDensitySettings } from './utils/bracketGeometry';

// Stable color for an initials avatar, derived from the team name.
const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

const colorForName = (name) => {
  const text = String(name || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const NodeAvatar = ({ name, logoUrl }) => {
  const [failed, setFailed] = useState(false);
  const src = logoUrl ? resolveMediaUrl(logoUrl) : null;
  return (
    <div className="relative flex h-6 w-6 max-h-6 max-w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80 dark:bg-slate-700 dark:ring-slate-600/80">
      {src && !failed ? (
        <img
          src={src}
          alt={name || "team"}
          onError={() => setFailed(true)}
          className="h-full w-full max-h-full max-w-full shrink-0 rounded-full object-cover object-center block"
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center rounded-full text-[9px] font-bold text-white ${colorForName(name)}`}
        >
          {initialsFromLabel(name, "?")}
        </span>
      )}
    </div>
  );
};

const TeamRow = ({ team, isUpcoming }) => {
  const rightValue = isUpcoming ? "—" : team.score;
  return (
    <div
      className={`flex min-h-0 flex-1 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-1.5 transition-all shadow-2xs ${team.isWinner
        ? "bg-emerald-50 text-emerald-950 border border-emerald-300/80 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/40"
        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-600"
        }`}
    >
      <NodeAvatar name={team.name} logoUrl={team.logoUrl} />
      <span
        className={`line-clamp-1 min-w-0 flex-1 text-[12.5px] font-medium leading-tight ${team.isWinner
          ? "font-bold text-slate-900 dark:text-emerald-100"
          : "text-slate-700 dark:text-slate-200"
          }`}
        title={team.name}
      >
        {team.displayName || team.name || "TBD"}
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${team.isWinner
          ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950"
          : isUpcoming
            ? "text-slate-400 dark:text-slate-500"
            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          }`}
      >
        {rightValue}
      </span>
    </div>
  );
};

const MatchCard = ({ match, isSelected, onClick, density = "regular", cardHeight: customHeight, dataBracketRole, children }) => {
  const isUpcoming = match.statusCategory === "upcoming";
  const geo = bracketDensitySettings[density] || bracketDensitySettings.regular;
  const cardHeight = customHeight || geo.cardHeight;

  return (
    <div
      className="flex w-full flex-col select-none"
      style={{
        height: `${geo.slotHeight}px`,
        gap: `${geo.labelGap}px`
      }}
      data-match-id={match.id}
      data-bracket-role={dataBracketRole || undefined}
    >
      <div
        className="flex items-center px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        style={{ height: `${geo.labelHeight}px` }}
      >
        {match.matchNumber ? `Match ${match.matchNumber}` : "\u00A0"}
      </div>
      <div
        className="relative"
        style={{ height: `${cardHeight}px` }}
        data-bracket-anchor={dataBracketRole || undefined}
      >
        <button
          type="button"
          onClick={onClick}
          style={{ height: `${cardHeight}px` }}
          className={`
            group relative flex w-full flex-col justify-center border-0 bg-transparent text-left transition-colors duration-150 rounded-xl
            ${isSelected ? "ring-2 ring-sky-500 shadow-sm" : "hover:brightness-95 dark:hover:brightness-110"}
          `}
        >
          <div className="flex h-full w-full flex-col justify-between gap-1.5">
            <TeamRow team={match.team1} isUpcoming={isUpcoming} />
            <TeamRow team={match.team2} isUpcoming={isUpcoming} />
          </div>
        </button>
        {children}
      </div>
    </div>
  );
};

export default MatchCard;
