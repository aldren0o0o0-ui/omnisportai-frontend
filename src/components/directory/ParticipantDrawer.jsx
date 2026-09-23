import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Pencil, Save, Trash2, X, Users, UserRound } from "lucide-react";
import { DepartmentLogo, PlayerAvatar, TeamLogo } from "../common/IdentityImage";
import { useProfileDrawer } from "../profile";

const ParticipantDrawer = ({
  participant,
  onClose,
  onSelectPlayer,
  onSaveIdentity,
  onLogoChange,
  onLogoRemove,
  identityBusy = false,
  identityMessage = "",
  initialEditing = false,
}) => {
  const { openProfile } = useProfileDrawer();
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [entryName, setEntryName] = useState(
    () => String(participant?.entry_name || participant?.display_name || "")
  );

  useEffect(() => {
    if (!participant) return undefined;
    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !document.querySelector('[data-directory-player-drawer="true"]')) onClose();
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [onClose, participant]);

  if (!participant) return null;
  const canEditName = Boolean(participant.capabilities?.can_edit_name);
  const canEditLogo = Boolean(participant.capabilities?.can_edit_logo);
  const canEdit = canEditName || canEditLogo;
  const shapeLabel = participant.participant_shape === "DUO"
    ? "Duo"
    : participant.participant_shape === "SOLO" ? "Solo" : "Team";

  return createPortal(
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[calc(var(--z-overlay)+20)] flex justify-end bg-slate-950/55 backdrop-blur-sm dark:bg-black/75"
      onMouseDown={onClose}
    >
      <Motion.aside
        ref={panelRef}
        tabIndex={-1}
        initial={{ x: reduceMotion ? 0 : "100%" }}
        animate={{ x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="participant-drawer-title"
        className="h-full w-full max-w-full overflow-y-auto border-l border-[var(--border-soft)] bg-[var(--surface)] p-3.5 text-[var(--text-main)] shadow-[var(--shadow-lg)] sm:max-w-lg sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo imageUrl={participant.image_url} label={participant.display_name} scale="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">{shapeLabel}</p>
              <h2 id="participant-drawer-title" className="break-words text-xl font-bold text-[var(--text-main)]">
                {participant.display_name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-500/30 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-200 dark:hover:bg-blue-500/10">
                <Pencil size={16} aria-hidden="true" /> Edit
              </button>
            ) : null}
            <button type="button" onClick={onClose} aria-label="Close participant details" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <X size={18} />
            </button>
          </div>
        </div>

        {isEditing ? (
          <section className="mt-6 space-y-4 border-y border-[var(--border-soft)] py-5" aria-labelledby="participant-identity-editor-title">
            <div>
              <h3 id="participant-identity-editor-title" className="font-bold">Edit participant identity</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Only the public name and image can be changed here.</p>
            </div>
            {canEditName ? (
              <label className="block">
                <span className="text-sm font-semibold">{participant.participant_shape === "TEAM" ? "Team name" : "Entry name"}</span>
                <input
                  value={entryName}
                  maxLength={120}
                  onChange={(event) => setEntryName(event.target.value)}
                  disabled={identityBusy}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm"
                />
              </label>
            ) : participant.capabilities?.name_lock_reason ? (
              <p className="text-sm text-[var(--text-muted)]">{participant.capabilities.name_lock_reason}</p>
            ) : null}
            {canEditLogo ? (
              <div>
                <p className="text-sm font-semibold">{participant.participant_shape === "TEAM" ? "Team logo" : "Entry image"}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">JPG, PNG, or WebP up to 2 MB.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-blue-500/30 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-500/10">
                    <ImagePlus size={16} aria-hidden="true" />
                    <span>{participant.image_url ? "Change image" : "Upload image"}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      aria-label={participant.image_url ? "Change participant image" : "Upload participant image"}
                      disabled={identityBusy}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (file) await onLogoChange?.(participant, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {participant.image_url ? (
                    <button type="button" disabled={identityBusy} onClick={() => onLogoRemove?.(participant)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 px-3 text-sm font-semibold text-rose-600 disabled:opacity-50">
                      <Trash2 size={16} aria-hidden="true" /> Remove image
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {identityMessage ? <p role="status" className="text-sm text-[var(--text-muted)]">{identityMessage}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={identityBusy} onClick={() => setIsEditing(false)} className="min-h-11 rounded-xl border border-[var(--border-soft)] px-4 text-sm font-semibold">Cancel</button>
              {canEditName ? (
                <button
                  type="button"
                  disabled={identityBusy || entryName.trim().length < 2}
                  onClick={async () => {
                    const saved = await onSaveIdentity?.(participant, entryName.trim());
                    if (saved) setIsEditing(false);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Save size={16} aria-hidden="true" /> {identityBusy ? "Saving…" : "Save name"}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <dl className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2">
          <div><dt className="text-xs text-[var(--text-soft)]">Sport</dt><dd className="mt-1 font-semibold">{getSportDisplayName(participant)}</dd></div>
          <div><dt className="text-xs text-[var(--text-soft)]">Event</dt><dd className="mt-1 font-semibold">{participant.event_name || shapeLabel}</dd></div>
          <div><dt className="text-xs text-[var(--text-soft)]">Status</dt><dd className="mt-1 font-semibold">{participant.public_status || "Registered"}</dd></div>
          {participant.participant_shape !== "TEAM" ? (
            <div className="sm:col-span-2"><dt className="text-xs text-[var(--text-soft)]">Entry name</dt><dd className="mt-1 break-words font-semibold">{participant.entry_name}</dd></div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--text-soft)]">Department</dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold">
              <DepartmentLogo imageUrl={participant.department_logo_url} label={participant.department_code || participant.department_name} scale="sm" />
              <span>{participant.department_name}</span>
            </dd>
          </div>
        </dl>

        <section className="mt-6" aria-labelledby="participant-coach-title">
          <h3 id="participant-coach-title" className="font-bold text-[var(--text-main)]">Coach</h3>
          {participant.coach ? (
            <button
              type="button"
              onClick={() => {
                const coachUserId = participant.coach.user_id || participant.coach.id;
                if (coachUserId) {
                  openProfile({
                    userId: Number(coachUserId),
                    tournamentId: participant?.tournament_id ? Number(participant.tournament_id) : null,
                  });
                }
              }}
              className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--border-soft)] p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10"
              aria-label={`View coach ${participant.coach.display_name}'s profile`}
            >
              <PlayerAvatar
                imageUrl={participant.coach.profile_image_url}
                label={participant.coach.display_name}
              />
              <div className="min-w-0">
                <p className="break-words font-semibold text-[var(--text-main)]">{participant.coach.display_name}</p>
                <p className="text-sm text-[var(--text-muted)]">Assigned for this Intramural</p>
              </div>
              <span className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-300">Profile</span>
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-[var(--border-soft)] p-4 text-sm text-[var(--text-muted)]">
              <UserRound size={20} aria-hidden="true" /> No coach is assigned to this entry.
            </div>
          )}
        </section>

        <section className="mt-6" aria-labelledby="official-roster-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="official-roster-title" className="font-bold text-[var(--text-main)]">{shapeLabel === "Team" ? "Players" : shapeLabel === "Duo" ? "Members" : "Athlete"}</h3>
              <p className="text-sm text-[var(--text-muted)]">{shapeLabel === "Team" ? "Approved roster for this Intramural." : shapeLabel === "Duo" ? "Both athletes in this entry." : "Athlete registered in this entry."}</p>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">{participant.members?.length || 0}</span>
          </div>
          <div className="mt-3 grid gap-2">
            {participant.members?.length ? participant.members.map((member) => (
              <button
                key={member.player_id || member.id}
                type="button"
                onClick={() => {
                  if (onSelectPlayer) {
                    onSelectPlayer(member, participant);
                  } else {
                    openProfile({
                      playerId: member.player_id || member.id || null,
                      userId: member.user_id || null,
                      tournamentId: participant?.tournament_id ? Number(participant.tournament_id) : null,
                      sportId: participant?.sport_id ? Number(participant.sport_id) : null,
                    });
                  }
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--border-soft)] p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10"
                aria-label={`View ${member.display_name}'s profile`}
              >
                <PlayerAvatar imageUrl={member.profile_image_url} label={member.display_name} />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[var(--text-main)]">{member.display_name}</p>
                  {member.position || member.jersey_number ? <p className="text-sm text-[var(--text-muted)]">{[member.position, member.jersey_number ? `Jersey #${member.jersey_number}` : ""].filter(Boolean).join(" · ")}</p> : null}
                </div>
                <span className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-300">Profile</span>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-5 text-center text-sm text-[var(--text-muted)]">
                <Users className="mx-auto mb-2" size={20} aria-hidden="true" />
                No approved members are listed yet.
              </div>
            )}
          </div>
        </section>
      </Motion.aside>
    </Motion.div>,
    document.body
  );
};

export default ParticipantDrawer;
