import { CalendarDays, ImagePlus } from "lucide-react";
import IntramuralStatusBadge from "./IntramuralStatusBadge";
import { resolveMediaUrl } from "../../utils/media";

const SEMESTER_LABELS = { FIRST: "First Semester", SECOND: "Second Semester", SUMMER: "Summer" };

const IntramuralCard = ({ intramural, tournament, selected = false, onOpen, onImageChange, imageBusy = false, actions = null }) => {
  const semester = SEMESTER_LABELS[String(intramural?.semester || "").toUpperCase()] || intramural?.semester;
  const imageUrl = resolveMediaUrl(intramural?.image_url);
  const sportsCount = Array.isArray(tournament?.sport_ids) ? tournament.sport_ids.length : null;

  return (
    <article className={`group flex min-h-full flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none ${selected ? "border-blue-400 ring-2 ring-blue-500/15" : "border-[var(--border-soft)]"}`}>
      <div className="relative aspect-[16/8] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transform-none" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-600 to-slate-800 text-white" aria-hidden="true">
            <CalendarDays size={38} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute left-3 top-3"><IntramuralStatusBadge status={intramural?.status} /></div>
        {onImageChange ? (
          <label className="absolute bottom-3 right-3 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-950/75 px-3 text-xs font-semibold text-white backdrop-blur hover:bg-slate-950">
            <ImagePlus size={14} /> {imageBusy ? "Uploading…" : imageUrl ? "Change image" : "Add image"}
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" disabled={imageBusy} onChange={(event) => onImageChange(event.target.files?.[0] || null)} />
          </label>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-lg font-bold text-[var(--text-main)]">{intramural?.name || tournament?.tournament_name || "Intramural"}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{intramural?.school_year || "School year not set"}{semester ? ` · ${semester}` : ""}</p>
        {intramural?.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{intramural.description}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-[var(--text-muted)]">
          {sportsCount !== null ? <span>{sportsCount} {sportsCount === 1 ? "sport" : "sports"}</span> : null}
          {tournament?.start_date && tournament?.end_date ? <span>{new Date(tournament.start_date).toLocaleDateString()} – {new Date(tournament.end_date).toLocaleDateString()}</span> : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] pt-4">
          {onOpen ? <button type="button" onClick={onOpen} className="os-btn-primary-soft min-h-10 flex-1">{selected ? "Current Intramural" : "View Intramural"}</button> : null}
          {actions}
        </div>
      </div>
    </article>
  );
};

export default IntramuralCard;
