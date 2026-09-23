import { useEffect, useState } from "react";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import AppModal from "../common/AppModal";
import { TeamLogo } from "../common/IdentityImage";
import {
  updateEntryIdentity,
  uploadEntryLogo,
  removeEntryLogo,
} from "../../services/competitionEntryService";

export const EntryEditModal = ({
  open,
  onClose,
  entry,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (entry && open) {
      setName(entry.display_name || entry.entry_name || entry.name || "");
      setLogoUrl(entry.image_url || entry.imageUrl || null);
      setMessage("");
    }
  }, [entry, open]);

  if (!entry) return null;

  const entryId = entry.entry_id || entry.id;
  const shape = String(entry.participant_shape || entry.shape || "TEAM").toUpperCase();
  const shapeLabel = shape === "SOLO" ? "Athlete" : shape === "DUO" ? "Pair" : "Team";

  const handleSaveName = async () => {
    if (!name.trim() || name.trim().length < 2) return;
    setBusy(true);
    setMessage("");
    try {
      await updateEntryIdentity(entryId, {
        entry_name: name.trim(),
      });
      setMessage(`${shapeLabel} name saved.`);
      onSuccess?.();
      setTimeout(() => onClose?.(), 600);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Could not update entry name.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await uploadEntryLogo(entryId, file);
      setLogoUrl(res?.logo_url || URL.createObjectURL(file));
      setMessage("Logo updated.");
      onSuccess?.();
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Could not upload image.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setBusy(true);
    setMessage("");
    try {
      await removeEntryLogo(entryId);
      setLogoUrl(null);
      setMessage("Logo removed.");
      onSuccess?.();
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Could not remove image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={() => !busy && onClose?.()}
      title={`Edit ${shapeLabel} Identity`}
      subtitle="Update public display name and logo."
      maxWidthClass="max-w-md"
    >
      <div className="space-y-5 text-xs">
        {/* Logo Section */}
        <div>
          <label className="block font-bold text-[var(--text-main)]">
            {shapeLabel} Logo / Visual
          </label>
          <div className="mt-2.5 flex items-center gap-4">
            <TeamLogo imageUrl={logoUrl} label={name} scale="xl" />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 font-bold text-[var(--text-main)] transition hover:bg-[var(--surface-muted)]">
                <ImagePlus size={14} />
                <span>{logoUrl ? "Change Logo" : "Upload Logo"}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {logoUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleLogoRemove()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 font-bold text-rose-400 hover:bg-rose-500/20"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div>
          <label className="block font-bold text-[var(--text-main)]">
            {shapeLabel} Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            disabled={busy}
            placeholder={`e.g. CITE Warriors`}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-xs text-[var(--text-main)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {message ? (
          <p className="text-xs font-semibold text-[var(--text-muted)]" role="status">
            {message}
          </p>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-9 rounded-xl border border-[var(--border-soft)] px-3.5 font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !name.trim() || name.trim().length < 2}
            onClick={() => void handleSaveName()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 font-bold text-white shadow-sm hover:bg-blue-500 disabled:opacity-40"
          >
            <Save size={14} />
            <span>{busy ? "Saving…" : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </AppModal>
  );
};

export default EntryEditModal;
