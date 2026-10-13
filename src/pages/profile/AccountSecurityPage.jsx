import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Laptop,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { changeMyPassword } from "../../services/userService";
import { resolveBackProfileRoute } from "../../utils/profileNavigation";

const AccountSecurityPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames = [], logout, logoutAll } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Logout actions state
  const [signingOut, setSigningOut] = useState(false);
  const [terminatingAll, setTerminatingAll] = useState(false);

  const backProfileRoute = useMemo(
    () => resolveBackProfileRoute(location.pathname, roleNames),
    [location.pathname, roleNames]
  );

  const isLengthValid = newPassword.length >= 8;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = currentPassword.trim().length > 0 && isLengthValid && isMatchValid;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!isLengthValid) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (!isMatchValid) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setPasswordSubmitting(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });

      setPasswordSuccess(
        res?.message || "Password updated successfully. Other active sessions have been invalidated."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err?.response?.data?.detail || "Failed to update password. Please check your credentials."
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleSignOutDevice = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to sign out of all devices and active sessions? You will need to log in again."
    );
    if (!confirmed) return;

    setTerminatingAll(true);
    try {
      if (logoutAll) {
        await logoutAll();
      } else {
        await logout();
      }
      navigate("/login");
    } finally {
      setTerminatingAll(false);
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="account-security-page"
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
          Account & Security
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Manage your password, authentication sessions, and sign-out controls.
        </p>
      </div>

      {/* 1. PASSWORD SECTION */}
      <section aria-labelledby="password-section-heading" className="space-y-4">
        <div className="flex items-center gap-2.5">
          <KeyRound className="h-4 w-4 text-[var(--text-muted)]" />
          <h2
            id="password-section-heading"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Change password
          </h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordSuccess && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400"
              data-testid="password-change-success"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400"
              data-testid="password-change-error"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
            {/* Current Password */}
            <div className="py-3.5 space-y-1.5">
              <label
                htmlFor="current-password"
                className="block text-xs font-medium text-[var(--text-main)]"
              >
                Current password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordSubmitting}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 pr-10 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition disabled:opacity-50"
                  placeholder="Enter current account password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="py-3.5 space-y-1.5">
              <label
                htmlFor="new-password"
                className="block text-xs font-medium text-[var(--text-main)]"
              >
                New password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordSubmitting}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 pr-10 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition disabled:opacity-50"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="py-3.5 space-y-1.5">
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-medium text-[var(--text-main)]"
              >
                Confirm new password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordSubmitting}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 pr-10 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition disabled:opacity-50"
                  placeholder="Re-type new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Validation Helpers */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)] pt-1">
            <span
              className={`flex items-center gap-1 ${
                isLengthValid ? "text-emerald-400 font-medium" : ""
              }`}
            >
              ● At least 8 characters
            </span>
            <span
              className={`flex items-center gap-1 ${
                isMatchValid ? "text-emerald-400 font-medium" : ""
              }`}
            >
              ● Passwords match
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPasswordError(null);
              }}
              disabled={passwordSubmitting || (!currentPassword && !newPassword && !confirmPassword)}
              className="rounded-lg border border-[var(--border-soft)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition cursor-pointer disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={passwordSubmitting || !isFormValid}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] px-4 py-2 text-xs font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              data-testid="change-password-button"
            >
              {passwordSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update password</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* 2. ACTIVE SESSIONS SECTION */}
      <section aria-labelledby="sessions-section-heading" className="space-y-4 pt-4 border-t border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[var(--text-muted)]" />
          <h2
            id="sessions-section-heading"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Active sessions
          </h2>
        </div>

        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          {/* Current Browser Session */}
          <div className="py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <Laptop className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text-main)] truncate">
                    Current device session
                  </p>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    Active now
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  Authenticated via secure HttpOnly cookie
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional notice about detailed fingerprinting */}
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          OmniSport AI protects your account with secure token rotation. Detailed multi-device fingerprinting (IP address and browser geography) is not currently stored by the server. To revoke all other active refresh sessions, use the button below.
        </p>

        <div>
          <button
            type="button"
            onClick={handleSignOutAllSessions}
            disabled={terminatingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--surface)] transition cursor-pointer disabled:opacity-50"
            data-testid="logout-all-button"
          >
            {terminatingAll ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Terminating sessions...</span>
              </>
            ) : (
              <span>Sign out of all sessions</span>
            )}
          </button>
        </div>
      </section>

      {/* 3. SIGN OUT SECTION */}
      <section aria-labelledby="signout-section-heading" className="space-y-4 pt-4 border-t border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          <LogOut className="h-4 w-4 text-[var(--text-muted)]" />
          <h2
            id="signout-section-heading"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Sign out
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-y border-[var(--border-soft)]">
          <div>
            <p className="text-sm font-medium text-[var(--text-main)]">
              Sign out of this device
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Revokes the active session cookie on this browser.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOutDevice}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50 shrink-0"
            data-testid="sign-out-device-button"
          >
            {signingOut ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AccountSecurityPage;
