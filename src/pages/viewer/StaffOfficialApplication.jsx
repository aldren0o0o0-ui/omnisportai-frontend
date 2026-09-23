import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import {
  MAX_STAFF_SKILLS,
  STAFF_ROLE_OPTIONS,
  STAFF_SKILL_OPTIONS,
  splitSkills,
  summarizeApiError,
} from "../../components/staff_officials/staffOfficialUi";
import { getSports } from "../../services/sportService";
import { submitStaffApplication } from "../../services/sportStaffService";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const chipBaseClass =
  "rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400";
const chipActiveClass =
  "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200";
const chipInactiveClass =
  "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800";

const StaffOfficialApplication = () => {
  const [sports, setSports] = useState([]);
  const [isLoadingSports, setIsLoadingSports] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    sport_id: "",
    preferred_role: "",
    experience: "",
    skills: [],
    availability: "",
    reason: "",
  });

  useEffect(() => {
    const loadSports = async () => {
      setIsLoadingSports(true);
      setLoadError("");
      try {
        const rows = await getSports();
        setSports(Array.isArray(rows) ? rows : []);
      } catch (error) {
        setSports([]);
        setLoadError(summarizeApiError(error, "Failed to load sports."));
      } finally {
        setIsLoadingSports(false);
      }
    };
    loadSports();
  }, []);

  const selectedSport = useMemo(
    () => sports.find((sport) => Number(sport.id) === Number(form.sport_id)) || null,
    [form.sport_id, sports]
  );

  const toggleSkill = (skill) => {
    setSubmitError("");
    setForm((previous) => {
      if (previous.skills.includes(skill)) {
        return { ...previous, skills: previous.skills.filter((item) => item !== skill) };
      }
      if (previous.skills.length >= MAX_STAFF_SKILLS) {
        setSubmitError(`Select up to ${MAX_STAFF_SKILLS} skills only.`);
        return previous;
      }
      return { ...previous, skills: [...previous.skills, skill] };
    });
  };

  const validate = () => {
    if (!Number(form.sport_id)) return "Sport is required.";
    if (!String(form.preferred_role || "").trim()) return "Preferred role is required.";
    if (!form.skills.length) return "Select at least 1 skill.";
    if (form.skills.length > MAX_STAFF_SKILLS) return `Select up to ${MAX_STAFF_SKILLS} skills only.`;
    if (!String(form.availability || "").trim()) return "Availability is required.";
    if (!String(form.reason || "").trim()) return "Reason is required.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitStaffApplication({
        sport_id: Number(form.sport_id),
        preferred_role: String(form.preferred_role || "").trim(),
        experience: String(form.experience || "").trim() || null,
        skills: form.skills.join(", "),
        availability: String(form.availability || "").trim(),
        reason: String(form.reason || "").trim(),
      });
      setSubmitSuccess("Application submitted successfully.");
      setForm({
        sport_id: "",
        preferred_role: "",
        experience: "",
        skills: [],
        availability: "",
        reason: "",
      });
    } catch (error) {
      const message = summarizeApiError(error, "Failed to submit staff application.");
      if (String(message).toLowerCase().includes("active staff application")) {
        setSubmitError("You already have an active staff application for this sport.");
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSports) {
    return (
      <div className="os-page-shell">
        <LoadingState message="Loading application form..." />
      </div>
    );
  }

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="Apply as Staff / Official"
        subtitle="Support intramural operations by applying as a referee, scorer, timekeeper, marshal, or event staff."
        breadcrumbs="Viewer / Staff & Officials / Apply"
        icon={ClipboardCheck}
      />

      <DashboardCard className="mb-6 border-l-4 border-l-blue-500">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Staff and official applications are open to students from any department.
        </p>
      </DashboardCard>

      {loadError ? (
        <DashboardCard className="mb-6 border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {loadError}
        </DashboardCard>
      ) : null}

      {!loadError && sports.length === 0 ? (
        <EmptyState
          title="No sports available"
          message="Sports list is currently unavailable. Please try again later."
        />
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <DashboardCard className="space-y-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sport <span className="text-rose-500">*</span>
              <select
                value={form.sport_id}
                onChange={(event) => setForm((previous) => ({ ...previous, sport_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select sport</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {getSportDisplayName(sport)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Preferred Role <span className="text-rose-500">*</span>
              <select
                value={form.preferred_role}
                onChange={(event) => setForm((previous) => ({ ...previous, preferred_role: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select preferred role</option>
                {STAFF_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Experience (Optional)
              <textarea
                rows={4}
                value={form.experience}
                onChange={(event) => setForm((previous) => ({ ...previous, experience: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Share officiating or support experience."
              />
            </label>

            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Skills <span className="text-rose-500">*</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STAFF_SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`${chipBaseClass} ${form.skills.includes(skill) ? chipActiveClass : chipInactiveClass}`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {form.skills.length} of {MAX_STAFF_SKILLS} selected
              </p>
            </div>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Availability <span className="text-rose-500">*</span>
              <textarea
                rows={3}
                value={form.availability}
                onChange={(event) => setForm((previous) => ({ ...previous, availability: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Example: Monday to Friday, 4PM to 7PM"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Reason <span className="text-rose-500">*</span>
              <textarea
                rows={4}
                value={form.reason}
                onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Tell us why you want to help manage intramural matches."
              />
            </label>

            {submitError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                {submitError}
              </div>
            ) : null}

            {submitSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                {submitSuccess}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </DashboardCard>

          <DashboardCard className="h-fit space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Review Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Sport</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {selectedSport ? getSportDisplayName(selectedSport) : "-"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Preferred Role</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{form.preferred_role || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Skills</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {splitSkills(form.skills.join(", ")).join(", ") || "-"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Availability</p>
                <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-900 dark:text-slate-100">
                  {form.availability || "-"}
                </p>
              </div>
            </div>
          </DashboardCard>
        </form>
      )}
    </div>
  );
};

export default StaffOfficialApplication;
