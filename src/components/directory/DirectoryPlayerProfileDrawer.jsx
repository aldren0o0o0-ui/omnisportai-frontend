import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { DepartmentLogo, PlayerAvatar, TeamLogo } from "../common/IdentityImage";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const DirectoryPlayerProfileDrawer = ({ selection, onClose }) => {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!selection) return undefined;
    returnFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [onClose, selection]);

  if (!selection) return null;
  const { player, participant } = selection;
  const participantType = participant.participant_shape === "TEAM" ? "Team" : participant.participant_shape === "DUO" ? "Duo" : "Solo";

  return createPortal(
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[calc(var(--z-overlay)+30)] flex justify-end bg-slate-950/60 backdrop-blur-md dark:bg-black/80" onMouseDown={onClose}>
      <Motion.aside data-directory-player-drawer="true" ref={panelRef} tabIndex={-1} initial={{ x: reduceMotion ? 0 : "100%" }} animate={{ x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }} role="dialog" aria-modal="true" aria-labelledby="directory-player-profile-title" className="h-full w-full max-w-full overflow-y-auto border-l border-[var(--border-soft)] bg-[var(--surface)] p-4 text-[var(--text-main)] shadow-[var(--shadow-lg)] sm:max-w-md sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close player profile" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={18} /></button>
        </div>

        <div className="mt-2 flex flex-col items-center text-center">
          <PlayerAvatar imageUrl={player.profile_image_url} label={player.display_name} scale="xl" />
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">Player Profile</p>
          <h2 id="directory-player-profile-title" className="mt-1 break-words text-2xl font-bold text-[var(--text-main)]">{player.display_name}</h2>
          {player.position ? <p className="mt-1 text-sm text-[var(--text-muted)]">{player.position}</p> : null}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <div className="flex items-start gap-2"><ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><p>This player is listed on an approved roster for the selected Intramural.</p></div>
        </div>

        <dl className="mt-5 divide-y divide-[var(--border-soft)] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4">
          <div className="flex items-center gap-3 py-4">
            <TeamLogo imageUrl={participant.image_url} label={participant.display_name} />
            <div className="min-w-0"><dt className="text-xs text-[var(--text-soft)]">{participantType}</dt><dd className="break-words font-semibold">{participant.display_name}</dd></div>
          </div>
          <div className="flex items-center gap-3 py-4">
            <DepartmentLogo imageUrl={participant.department_logo_url} label={participant.department_code || participant.department_name} />
            <div className="min-w-0"><dt className="text-xs text-[var(--text-soft)]">Department</dt><dd className="break-words font-semibold">{participant.department_name}</dd></div>
          </div>
          <div className="py-4"><dt className="text-xs text-[var(--text-soft)]">Sport</dt><dd className="mt-1 font-semibold">{getSportDisplayName(participant)}</dd></div>
          <div className="py-4"><dt className="text-xs text-[var(--text-soft)]">Event</dt><dd className="mt-1 font-semibold">{participant.event_name || participantType}</dd></div>
        </dl>

        <p className="mt-5 text-xs leading-5 text-[var(--text-soft)]">Only competition-related public information is shown. Contact, student, medical, and account information remain private.</p>
      </Motion.aside>
    </Motion.div>,
    document.body
  );
};

export default DirectoryPlayerProfileDrawer;
