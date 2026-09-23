import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Trash2, Trophy } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import { SportIcon } from "../../components/common/IdentityImage";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getSports, removeSportImage, uploadSportImage } from "../../services/sportService";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const FacilitatorSports = () => {
  const access = useTournamentAccess();
  const [sports, setSports] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const assignedIds = useMemo(() => new Set(access.roleContexts.filter((context) => context?.role === "sports_facilitator" && context?.sport_id).map((context) => Number(context.sport_id))), [access.roleContexts]);

  const load = async () => {
    const rows = await getSports();
    setSports((Array.isArray(rows) ? rows : []).filter((sport) => assignedIds.has(Number(sport.id))));
  };

  useEffect(() => {
    if (!access.loading && assignedIds.size) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.loading, assignedIds]);

  const openEditor = (sport) => { setEditing(sport); setMessage(""); };
  const changeImage = async (file, remove = false) => {
    if (!editing || (!file && !remove)) return;
    setBusy(true); setMessage("");
    try {
      const updated = remove ? await removeSportImage(editing.id) : await uploadSportImage(editing.id, file);
      await load();
      setEditing((current) => current ? { ...current, image_url: updated?.image_url || null } : current);
      setMessage(remove ? "Sport image removed." : "Sport image updated.");
    } catch (error) { setMessage(error?.response?.data?.detail || "The sport image could not be updated."); }
    finally { setBusy(false); }
  };

  return <main className="os-page-shell space-y-6">
    <PageHeaderCard title="My Sports" subtitle="Manage the image of sports assigned to you for this Intramural." icon={Trophy} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sports.map((sport) => <article key={sport.id} className="flex items-center gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
      <SportIcon imageUrl={sport.image_url} label={getSportDisplayName(sport)} scale="lg" />
      <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-bold">{getSportDisplayName(sport)}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{sport.description || "Assigned Intramural sport"}</p></div>
      <button type="button" onClick={() => openEditor(sport)} className="inline-grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--border-soft)]" aria-label={`Edit ${getSportDisplayName(sport)}`}><Pencil size={17} /></button>
    </article>)}</div>
    {!access.loading && !sports.length ? <p className="rounded-xl border border-dashed border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">No sport is assigned to you in this Intramural.</p> : null}
    <AppModal open={Boolean(editing)} onClose={() => !busy && setEditing(null)} title="Manage sport image" subtitle="The sport name is set by the system capability." maxWidthClass="max-w-lg">
      <div className="space-y-5"><div className="flex items-center gap-4"><SportIcon imageUrl={editing?.image_url} label={getSportDisplayName(editing)} scale="xl" /><div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-soft)] px-3 text-sm font-semibold"><ImagePlus size={16} /> Change image<input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void changeImage(file); event.target.value = ""; }} /></label>
        {editing?.image_url ? <button type="button" disabled={busy} onClick={() => void changeImage(null, true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 px-3 text-sm font-semibold text-rose-600"><Trash2 size={16} /> Remove</button> : null}
      </div></div><p className="text-sm font-semibold text-[var(--text-main)]">{getSportDisplayName(editing)}</p>
      {message ? <p role="status" className="text-sm text-[var(--text-muted)]">{message}</p> : null}</div>
    </AppModal>
  </main>;
};

export default FacilitatorSports;
