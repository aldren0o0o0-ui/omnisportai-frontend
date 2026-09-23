import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  assignCoach,
  assignSportFacilitator,
  createRoleAssignment,
  deleteRoleAssignment,
  getRoleAssignments
} from "../../services/adminService";
import { getDepartments } from "../../services/departmentService";
import { getSports } from "../../services/sportService";
import { useAuth } from "../../context/AuthContext";
import { Users } from "lucide-react";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const ROLE_DEPARTMENT_MANAGER = 2;
const ROLE_SPORT_FACILITATOR = 3;
const ROLE_COACH = 5;

const cardCls = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500";
const btnPrimary = "w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60";
const rowCls = "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50";

const SportsFacilitators = () => {
  const location = useLocation();
  const { user, isSportsCoordinator, isDepartmentManager } = useAuth();
  const isCoordinatorRoute = location.pathname.startsWith("/coordinator");
  const departmentId = user?.department_id || null;

  const [sports, setSports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [departmentManagers, setDepartmentManagers] = useState([]);
  const [coaches, setCoaches] = useState([]);

  const [facilitatorForm, setFacilitatorForm] = useState({ email: "", sport_id: "" });
  const [departmentManagerForm, setDepartmentManagerForm] = useState({ email: "", department_id: "" });
  const [coachForm, setCoachForm] = useState({ email: "", sport_id: "" });

  const [facilitatorMessage, setFacilitatorMessage] = useState("");
  const [departmentManagerMessage, setDepartmentManagerMessage] = useState("");
  const [coachMessage, setCoachMessage] = useState("");

  const [facilitatorLoading, setFacilitatorLoading] = useState(false);
  const [departmentManagerLoading, setDepartmentManagerLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, assignmentId: null, roleName: "", assigneeLabel: "" });

  const sportNameById = useMemo(
    () => Object.fromEntries(sports.map((sport) => [sport.id, sport.sport_name])),
    [sports]
  );
  const departmentNameById = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.department_name])),
    [departments]
  );

  const loadCoordinatorData = async () => {
    const [sportsData, departmentsData, facilitatorsData, managersData] = await Promise.all([
      getSports(), getDepartments(),
      getRoleAssignments({ role_id: ROLE_SPORT_FACILITATOR }),
      getRoleAssignments({ role_id: ROLE_DEPARTMENT_MANAGER })
    ]);
    setSports(sportsData); setDepartments(departmentsData);
    setFacilitators(facilitatorsData); setDepartmentManagers(managersData);
  };

  const loadDepartmentManagerData = async (targetDepartmentId) => {
    const [sportsData, coachesData] = await Promise.all([
      getSports(),
      getRoleAssignments({ role_id: ROLE_COACH, department_id: targetDepartmentId })
    ]);
    setSports(sportsData); setCoaches(coachesData);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (isCoordinatorRoute && isSportsCoordinator) { await loadCoordinatorData(); return; }
        if (!isCoordinatorRoute && isDepartmentManager && departmentId) { await loadDepartmentManagerData(departmentId); }
      } catch { setFacilitatorMessage("Failed to load role assignment data."); }
    };
    bootstrap();
  }, [isCoordinatorRoute, isSportsCoordinator, isDepartmentManager, departmentId]);

  const handleAssignFacilitator = async (event) => {
    event.preventDefault(); setFacilitatorMessage("");
    const sportId = Number(facilitatorForm.sport_id);
    if (!facilitatorForm.email.trim() || !sportId) { setFacilitatorMessage("Email and sport are required."); return; }
    setFacilitatorLoading(true);
    try {
      await assignSportFacilitator({ email: facilitatorForm.email.trim(), sport_id: sportId });
      setFacilitatorForm({ email: "", sport_id: "" });
      setFacilitatorMessage("Sport facilitator assigned.");
      const data = await getRoleAssignments({ role_id: ROLE_SPORT_FACILITATOR });
      setFacilitators(data);
    } catch (error) { setFacilitatorMessage(error.response?.data?.detail || "Failed to assign sport facilitator."); }
    finally { setFacilitatorLoading(false); }
  };

  const handleAssignDepartmentManager = async (event) => {
    event.preventDefault(); setDepartmentManagerMessage("");
    const targetDeptId = Number(departmentManagerForm.department_id);
    if (!departmentManagerForm.email.trim() || !targetDeptId) { setDepartmentManagerMessage("Email and department are required."); return; }
    setDepartmentManagerLoading(true);
    try {
      await createRoleAssignment({ email: departmentManagerForm.email.trim(), role_id: ROLE_DEPARTMENT_MANAGER, department_id: targetDeptId });
      setDepartmentManagerForm({ email: "", department_id: "" });
      setDepartmentManagerMessage("Department manager assigned.");
      const data = await getRoleAssignments({ role_id: ROLE_DEPARTMENT_MANAGER });
      setDepartmentManagers(data);
    } catch (error) { setDepartmentManagerMessage(error.response?.data?.detail || "Failed to assign department manager."); }
    finally { setDepartmentManagerLoading(false); }
  };

  const handleAssignCoach = async (event) => {
    event.preventDefault(); setCoachMessage("");
    const sportId = Number(coachForm.sport_id);
    if (!coachForm.email.trim() || !sportId || !departmentId) { setCoachMessage("Email and sport are required."); return; }
    setCoachLoading(true);
    try {
      await assignCoach({ email: coachForm.email.trim(), department_id: departmentId, sport_id: sportId });
      setCoachForm({ email: "", sport_id: "" });
      setCoachMessage("Coach assigned.");
      const data = await getRoleAssignments({ role_id: ROLE_COACH, department_id: departmentId });
      setCoaches(data);
    } catch (error) { setCoachMessage(error.response?.data?.detail || "Failed to assign coach."); }
    finally { setCoachLoading(false); }
  };

  const openDeleteConfirm = (assignment) => {
    setConfirmModal({ isOpen: true, assignmentId: assignment.assignment_id, roleName: assignment.role_name, assigneeLabel: `${assignment.name} (${assignment.email})` });
  };
  const closeDeleteConfirm = () => { if (deleteLoading) return; setConfirmModal({ isOpen: false, assignmentId: null, roleName: "", assigneeLabel: "" }); };

  const confirmDeleteAssignment = async () => {
    if (!confirmModal.assignmentId) return;
    const { assignmentId, roleName } = confirmModal;
    setDeleteLoading(true);
    try {
      await deleteRoleAssignment(assignmentId);
      if (roleName === "SPORTS_FACILITATOR") { const data = await getRoleAssignments({ role_id: ROLE_SPORT_FACILITATOR }); setFacilitators(data); setFacilitatorMessage("Sport facilitator removed."); }
      else if (roleName === "DEPARTMENT_MANAGER") { const data = await getRoleAssignments({ role_id: ROLE_DEPARTMENT_MANAGER }); setDepartmentManagers(data); setDepartmentManagerMessage("Department manager removed."); }
      else if (roleName === "COACH" && departmentId) { const data = await getRoleAssignments({ role_id: ROLE_COACH, department_id: departmentId }); setCoaches(data); setCoachMessage("Coach removed."); }
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to remove assignment.";
      if (roleName === "SPORTS_FACILITATOR") setFacilitatorMessage(message);
      if (roleName === "DEPARTMENT_MANAGER") setDepartmentManagerMessage(message);
      if (roleName === "COACH") setCoachMessage(message);
    } finally {
      setDeleteLoading(false);
      setConfirmModal({ isOpen: false, assignmentId: null, roleName: "", assigneeLabel: "" });
    }
  };

  const MsgBanner = ({ msg }) => {
    if (!msg) return null;
    const isSuccess = msg.toLowerCase().includes("assigned") || msg.toLowerCase().includes("removed");
    return (
      <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"}`}>
        {msg}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeaderCard
        icon={Users}
        title="Role Assignments"
        subtitle="Assign sport facilitators, department managers, and coaches to their respective roles."
      />

      {isCoordinatorRoute && isSportsCoordinator && (
        <>
          {/* Assign Sport Facilitator */}
          <div className={cardCls}>
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">Assign Sport Facilitator</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Assign by email and sport. Remove the current facilitator first to reassign.</p>
            <form onSubmit={handleAssignFacilitator} className="space-y-3">
              <input name="facilitator_email" placeholder="user@school.edu" className={inputCls} value={facilitatorForm.email} onChange={(e) => setFacilitatorForm((prev) => ({ ...prev, email: e.target.value }))} />
              <select name="facilitator_sport" className={inputCls} value={facilitatorForm.sport_id} onChange={(e) => setFacilitatorForm((prev) => ({ ...prev, sport_id: e.target.value }))}>
                <option value="">Select sport</option>
                {sports.map((sport) => (<option key={sport.id} value={sport.id}>{getSportDisplayName(sport)}</option>))}
              </select>
              <button disabled={facilitatorLoading} className={btnPrimary}>{facilitatorLoading ? "Assigning..." : "Assign Sport Facilitator"}</button>
            </form>
            <MsgBanner msg={facilitatorMessage} />
          </div>

          {/* Current Sport Facilitators */}
          <div className={cardCls}>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Current Sport Facilitators</h2>
            <div className="space-y-2">
              {facilitators.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No sport facilitators assigned.</p>
              ) : facilitators.map((a) => (
                <div key={a.assignment_id} className={rowCls}>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{a.name} ({a.email}) | {sportNameById[a.sport_id] || "Unassigned sport"} | {departmentNameById[a.department_id] || "Unknown department"}</div>
                  <button onClick={() => openDeleteConfirm(a)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Assign Department Manager */}
          <div className={cardCls}>
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">Assign Department Manager</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">One department manager per department. Remove the current manager to replace.</p>
            <form onSubmit={handleAssignDepartmentManager} className="space-y-3">
              <input name="manager_email" placeholder="manager@school.edu" className={inputCls} value={departmentManagerForm.email} onChange={(e) => setDepartmentManagerForm((prev) => ({ ...prev, email: e.target.value }))} />
              <select name="manager_department" className={inputCls} value={departmentManagerForm.department_id} onChange={(e) => setDepartmentManagerForm((prev) => ({ ...prev, department_id: e.target.value }))}>
                <option value="">Select department</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.department_name}</option>))}
              </select>
              <button disabled={departmentManagerLoading} className={btnPrimary}>{departmentManagerLoading ? "Assigning..." : "Assign Department Manager"}</button>
            </form>
            <MsgBanner msg={departmentManagerMessage} />
          </div>

          {/* Current Department Managers */}
          <div className={cardCls}>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Current Department Managers</h2>
            <div className="space-y-2">
              {departmentManagers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No department managers assigned.</p>
              ) : departmentManagers.map((a) => (
                <div key={a.assignment_id} className={rowCls}>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{a.name} ({a.email}) | {departmentNameById[a.department_id] || "Unknown department"}</div>
                  <button onClick={() => openDeleteConfirm(a)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!isCoordinatorRoute && isDepartmentManager && departmentId && (
        <>
          {/* Assign Coach */}
          <div className={cardCls}>
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">Assign Coach</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Assign one coach per sport in your department. Remove the current coach to reassign.</p>
            <form onSubmit={handleAssignCoach} className="space-y-3">
              <input name="coach_email" placeholder="coach@school.edu" className={inputCls} value={coachForm.email} onChange={(e) => setCoachForm((prev) => ({ ...prev, email: e.target.value }))} />
              <select name="coach_sport" className={inputCls} value={coachForm.sport_id} onChange={(e) => setCoachForm((prev) => ({ ...prev, sport_id: e.target.value }))}>
                <option value="">Select sport</option>
                {sports.map((sport) => (<option key={sport.id} value={sport.id}>{getSportDisplayName(sport)}</option>))}
              </select>
              <button disabled={coachLoading} className={btnPrimary}>{coachLoading ? "Assigning..." : "Assign Coach"}</button>
            </form>
            <MsgBanner msg={coachMessage} />
          </div>

          {/* Current Coaches */}
          <div className={cardCls}>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Current Coaches</h2>
            <div className="space-y-2">
              {coaches.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No coaches assigned.</p>
              ) : coaches.map((a) => (
                <div key={a.assignment_id} className={rowCls}>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{a.name} ({a.email}) | {sportNameById[a.sport_id] || "Unassigned sport"}</div>
                  <button onClick={() => openDeleteConfirm(a)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Remove</h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Remove <span className="font-semibold">{confirmModal.assigneeLabel}</span> from {confirmModal.roleName.replaceAll("_", " ").toLowerCase()} role?
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This action allows assigning a new user for that role scope.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={closeDeleteConfirm} disabled={deleteLoading} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Cancel</button>
              <button onClick={confirmDeleteAssignment} disabled={deleteLoading} className="min-h-10 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">{deleteLoading ? "Removing..." : "Remove"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SportsFacilitators;
