import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Building2,
  Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyProfile,
  updateMyProfile,
  uploadUserProfileImage,
  removeUserProfileImage,
} from "../../services/userService";
import { PlayerAvatar } from "../../components/common/IdentityImage";
import { resolveBackProfileRoute } from "../../utils/profileNavigation";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, roleNames = [], retrySession } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const backProfileRoute = useMemo(
    () => resolveBackProfileRoute(location.pathname, roleNames),
    [location.pathname, roleNames]
  );

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const payload = await getMyProfile();
        if (!isMounted) return;
        setProfileData(payload);
        const u = payload?.user || {};
        setDisplayName(u.display_name || u.full_name || u.name || authUser?.name || "");
        setEmail(u.email || authUser?.email || "");
        setBio(u.bio || "");
        setAvatarUrl(u.avatar_url || authUser?.profile_image_url || "");
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(
          err?.response?.data?.detail || "Unable to load current profile details."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image file size exceeds the 5MB limit.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setErrorMessage(null);
  };

  const handleRemovePhoto = async () => {
    const userId = profileData?.user?.id || authUser?.id;
    if (!userId) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await removeUserProfileImage(userId);
      setAvatarUrl("");
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (retrySession) await retrySession();
      setSuccessMessage("Profile photo removed successfully.");
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.detail || "Failed to remove profile photo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setErrorMessage("Display name cannot be blank.");
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage("Email address cannot be blank.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const userId = profileData?.user?.id || authUser?.id;

    try {
      // 1. Upload photo if selected
      if (selectedFile && userId) {
        await uploadUserProfileImage(userId, selectedFile);
      }

      // 2. Update basic fields (name, email, bio)
      await updateMyProfile({
        name: trimmedName,
        email: trimmedEmail,
        bio: bio.trim() || null,
      });

      if (retrySession) {
        await retrySession();
      }

      setSuccessMessage("Profile updated successfully.");
      setTimeout(() => {
        navigate(backProfileRoute);
      }, 1200);
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.detail || "Failed to save profile changes. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentPhoto = previewUrl || avatarUrl;
  const user = profileData?.user || authUser || {};
  const departmentName =
    user.department_name ||
    user.department?.department_name ||
    authUser?.department_name ||
    "Not assigned";

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="edit-profile-page"
    >
      {/* Top Navigation */}
      <div>
        <button
          type="button"
          onClick={() => navigate(backProfileRoute)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer group"
          data-testid="back-to-profile-button"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to profile</span>
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--border-soft)] pb-4">
        <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
          Edit profile
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Update your personal information and display avatar.
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div
          className="flex min-h-[250px] flex-col items-center justify-center gap-3 p-8 text-center"
          data-testid="edit-profile-loading"
        >
          <Loader2 className="h-7 w-7 animate-spin text-[var(--primary)]" />
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Loading profile details...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Notifications */}
          {successMessage && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400"
              data-testid="edit-profile-success"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400"
              data-testid="edit-profile-error"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Profile Photo */}
          <section aria-labelledby="photo-section-heading" className="space-y-3">
            <h2
              id="photo-section-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
            >
              Profile photo
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
              <div className="relative shrink-0">
                <PlayerAvatar
                  src={currentPhoto}
                  name={displayName || user.name || "User"}
                  scale="xl"
                  shape="circle"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  id="profile-avatar-upload"
                  disabled={submitting}
                />
                <label
                  htmlFor="profile-avatar-upload"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--surface)] transition cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>Choose new photo</span>
                </label>

                {currentPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Supported formats: PNG, JPG, or WebP. Max file size: 5MB.
            </p>
          </section>

          {/* Section: Personal Information */}
          <section aria-labelledby="info-section-heading" className="space-y-4">
            <h2
              id="info-section-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
            >
              Personal information
            </h2>

            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              {/* Display Name */}
              <div className="py-3.5 space-y-1.5">
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-medium text-[var(--text-main)]"
                >
                  Display name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  maxLength={120}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition disabled:opacity-50"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Bio */}
              <div className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="profile-bio"
                    className="block text-xs font-medium text-[var(--text-main)]"
                  >
                    Bio / About
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {bio.length} / 512
                  </span>
                </div>
                <textarea
                  id="profile-bio"
                  rows={3}
                  maxLength={512}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition disabled:opacity-50 resize-y min-h-[70px]"
                  placeholder="Write a brief bio about your role or sporting background..."
                />
              </div>

              {/* Email */}
              <div className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="profile-email"
                    className="block text-xs font-medium text-[var(--text-main)]"
                  >
                    Email address <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Primary login identifier
                  </span>
                </div>
                <input
                  id="profile-email"
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition disabled:opacity-50"
                  placeholder="Enter your institutional email address"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Updating your email changes the email used to sign in to OmniSport AI.
                </p>
              </div>

              {/* Department (Read-only) */}
              <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs font-medium text-[var(--text-main)]">Department</span>
                    <Lock className="h-3 w-3 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Managed by institutional administrator
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)] sm:text-right font-medium">
                  {departmentName}
                </span>
              </div>

              {/* Roles (Read-only) */}
              <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs font-medium text-[var(--text-main)]">Assigned roles</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Security roles assigned to your account
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {roleNames.length > 0 ? (
                    roleNames.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--surface-soft)] text-[var(--text-main)] border border-[var(--border-soft)]"
                      >
                        {role.replace(/_/g, " ")}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Viewer</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(backProfileRoute)}
              disabled={submitting}
              className="rounded-lg border border-[var(--border-soft)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !displayName.trim() || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] px-4 py-2 text-xs font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              data-testid="save-profile-button"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditProfilePage;
