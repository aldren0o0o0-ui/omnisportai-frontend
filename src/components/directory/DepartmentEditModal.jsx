import { useEffect, useState } from "react";
import { ImagePlus, Save, Trash2, X } from "lucide-react";
import AppModal from "../common/AppModal";
import { DepartmentLogo } from "../common/IdentityImage";
import {
  updateDepartment,
  uploadDepartmentImage,
  removeDepartmentImage,
} from "../../services/departmentService";

export const DepartmentEditModal = ({
  open,
  onClose,
  department,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (department && open) {
      setName(department.department_name || "");
      setLogoUrl(department.logo_url || null);
      setMessage("");
    }
  }, [department, open]);

  if (!department) return null;

  const handleSaveName = async () => {
    if (!name.trim() || name.trim().length < 2) return;
    setBusy(true);
    setMessage("");
    try {
      await updateDepartment(department.department_id || department.id, {
        department_name: name.trim(),
      });
      setMessage("Department name saved.");
      onSuccess?.();
      setTimeout(() => onClose?.(), 600);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Could not update department name.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await uploadDepartmentImage(department.department_id || department.id, file);
      setLogoUrl(res?.logo_url || URL.createObjectURL(file));
      setMessage("Department logo updated.");
      onSuccess?.();
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Could not upload department logo.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setBusy(true);
    setMessage("");
    try {
      await removeDepartmentImage(department.department_id || department.id);
      setLogoUrl(null);
      setMessage("Department logo removed.");
      onSuccess?.();
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Could not remove department logo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={() => !busy && onClose?.()}
      title="Edit Department Identity"
      subtitle="Update public department name and official crest."
      maxWidthClass="max-w-md"
    >
      <div className="space-y-5 text-xs">
        {/* Logo Section */}
        <div>
          <label className="block font-bold text-[var(--text-main)]">
            Department Logo
          </label>
          <div className="mt-2.5 flex items-center gap-4">
            <DepartmentLogo imageUrl={logoUrl} label={name} scale="xl" />
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
            Department Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            disabled={busy}
            placeholder="e.g. College of Information Technology Education"
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

export default DepartmentEditModal;
