import React, { useState, useEffect } from "react";
import { X, Camera, Trash2, Loader2, AlertCircle } from "lucide-react";
import { updateMyProfile, uploadUserProfileImage, removeUserProfileImage } from "../../services/userService";
import { PlayerAvatar } from "../common/IdentityImage";

/**
 * ProfileEditModal
 * Clean, institutional modal for editing personal profile information (name, bio, photo).
 */
export const ProfileEditModal = ({
  isOpen = false,
  onClose,
  user = {},
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user?.display_name || user?.full_name || user?.name || "");
      setBio(user?.bio || "");
      setAvatarUrl(user?.avatar_url || "");
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      await removeUserProfileImage(user.id);
      setAvatarUrl("");
      setPreviewUrl(null);
      setSelectedFile(null);
      onProfileUpdated?.();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to remove profile photo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload photo if selected
      if (selectedFile && user?.id) {
        await uploadUserProfileImage(user.id, selectedFile);
      }

      // 2. Update basic fields (name, bio)
      await updateMyProfile({
        name: displayName.trim(),
        bio: bio.trim() || null,
      });

      onProfileUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentPhoto = previewUrl || avatarUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      data-testid="profile-edit-modal"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
          <h2 id="edit-profile-title" className="text-base font-bold text-[var(--text-main)]">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <PlayerAvatar imageUrl={currentPhoto} label={displayName || "User"} scale="lg" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 font-semibold text-[var(--text-main)] hover:bg-[var(--surface)] transition-colors cursor-pointer">
                <Camera size={13} />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {currentPhoto ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <label htmlFor="edit-profile-name" className="text-xs font-semibold text-[var(--text-muted)]">
              Display Name
            </label>
            <input
              id="edit-profile-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={120}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              placeholder="Your full or display name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label htmlFor="edit-profile-bio" className="text-xs font-semibold text-[var(--text-muted)]">
              Short Bio
            </label>
            <textarea
              id="edit-profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
              placeholder="A brief sentence about your institutional role or sports interest..."
            />
            <p className="text-[10px] text-[var(--text-soft)] text-right">
              {bio.length}/300
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
