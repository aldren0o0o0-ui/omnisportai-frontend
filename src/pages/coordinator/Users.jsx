import { useEffect, useMemo, useState } from "react";
import {
  createRoleAssignment,
  getInviteCodeStatus,
  updateInviteCode
} from "../../services/adminService";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  removeDepartmentImage,
  uploadDepartmentImage,
  updateDepartment
} from "../../services/departmentService";
import { DepartmentLogo } from "../../components/common/IdentityImage";
import { KeyRound, Shield, Building2 } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500";
const btnPrimary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60";
const btnGhost = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

const Users = () => {
  const [form, setForm] = useState({ email: "", department_id: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [inviteStatus, setInviteStatus] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [deptMessage, setDeptMessage] = useState("");
  const [deptForm, setDeptForm] = useState({ department_code: "", department_name: "" });
  const [deptEditingId, setDeptEditingId] = useState(null);
  const [deptEditForm, setDeptEditForm] = useState({ department_code: "", department_name: "" });
  const [deptImageActionById, setDeptImageActionById] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    departmentId: null,
    busy: false,
    error: "",
  });

  const loadDepartments = async () => {
    setDeptLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } finally {
      setDeptLoading(false);
    }
  };

  useEffect(() => { loadDepartments(); }, []);

  const loadInviteStatus = async () => {
    setInviteLoading(true);
    setInviteMessage("");
    try {
      const data = await getInviteCodeStatus();
      setInviteStatus(data);
    } catch (error) {
      setInviteMessage(error.response?.data?.detail || "Failed to load invite code status.");
    } finally {
      setInviteLoading(false);
    }
  };

  useEffect(() => { loadInviteStatus(); }, []);

  const filteredDepartments = useMemo(() => {
    if (!deptQuery.trim()) return departments;
    const q = deptQuery.trim().toLowerCase();
    return departments.filter((dept) =>
      dept.department_name.toLowerCase().includes(q) ||
      dept.department_code.toLowerCase().includes(q)
    );
  }, [deptQuery, departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!form.email || !form.department_id) { setMessage("Email and department are required."); return; }
    const departmentId = Number(form.department_id);
    if (Number.isNaN(departmentId) || departmentId <= 0) { setMessage("Department is required."); return; }
    setLoading(true);
    try {
      await createRoleAssignment({ email: form.email.trim(), role_id: 2, department_id: departmentId });
      setMessage("Department manager assigned successfully.");
      setForm({ email: "", department_id: "" });
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to assign department manager.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeptCreate = async (e) => {
    e.preventDefault();
    setDeptMessage("");
    if (!deptForm.department_code || !deptForm.department_name) { setDeptMessage("Department code and name are required."); return; }
    try {
      await createDepartment({ department_code: deptForm.department_code.trim(), department_name: deptForm.department_name.trim() });
      setDeptMessage("Department created.");
      setDeptForm({ department_code: "", department_name: "" });
      loadDepartments();
    } catch (error) {
      setDeptMessage(error.response?.data?.detail || "Failed to create department.");
    }
  };

  const startDeptEdit = (dept) => { setDeptEditingId(dept.id); setDeptEditForm({ department_code: dept.department_code || "", department_name: dept.department_name || "" }); };
  const cancelDeptEdit = () => setDeptEditingId(null);

  const saveDeptEdit = async () => {
    if (!deptEditForm.department_code || !deptEditForm.department_name) { setDeptMessage("Department code and name are required."); return; }
    try {
      await updateDepartment(deptEditingId, { department_code: deptEditForm.department_code.trim(), department_name: deptEditForm.department_name.trim() });
      setDeptEditingId(null);
      loadDepartments();
    } catch (error) {
      setDeptMessage(error.response?.data?.detail || "Failed to update department.");
    }
  };

  const handleDeptDelete = async (deptId) => {
    setConfirmModal({
      open: true,
      type: "delete_department",
      departmentId: Number(deptId || 0) || null,
      busy: false,
      error: "",
    });
  };

  const setDeptImageAction = (deptId, loading) => setDeptImageActionById((prev) => ({ ...prev, [deptId]: { loading } }));

  const handleDeptImageUpload = async (deptId, file) => {
    if (!file || !deptId) return;
    setDeptImageAction(deptId, true); setDeptMessage("");
    try { await uploadDepartmentImage(deptId, file); await loadDepartments(); setDeptMessage("Department logo updated."); }
    catch (error) { setDeptMessage(error.response?.data?.detail || "Failed to upload department logo."); }
    finally { setDeptImageAction(deptId, false); }
  };

  const handleDeptImageRemove = async (deptId) => {
    if (!deptId) return;
    setDeptImageAction(deptId, true); setDeptMessage("");
    try { await removeDepartmentImage(deptId); await loadDepartments(); setDeptMessage("Department logo removed."); }
    catch (error) { setDeptMessage(error.response?.data?.detail || "Failed to remove department logo."); }
    finally { setDeptImageAction(deptId, false); }
  };

  const inviteStatusLabel = useMemo(() => {
    if (!inviteStatus) return "Loading...";
    if (!inviteStatus.configured) return "Not configured";
    if (inviteStatus.source === "db") return "Configured (database)";
    if (inviteStatus.source === "env") return "Configured (environment variable)";
    return "Configured";
  }, [inviteStatus]);

  const inviteUpdatedAt = useMemo(() => {
    if (!inviteStatus?.updated_at) return null;
    try { return new Date(inviteStatus.updated_at).toLocaleString(); } catch { return null; }
  }, [inviteStatus]);

  const generateInviteCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const length = 12;
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    let code = "";
    for (let i = 0; i < length; i += 1) { code += alphabet[values[i] % alphabet.length]; }
    setInviteCode(code);
  };

  const executeInviteSave = async () => {
    const trimmed = inviteCode.trim();
    if (trimmed.length < 8) { setInviteMessage("Invite code must be at least 8 characters."); return; }
    setInviteSaving(true); setInviteMessage("");
    try {
      await updateInviteCode({ code: trimmed });
      setInviteMessage("Invite code updated.");
      setInviteCode("");
      setConfirmModal({ open: false, type: "", departmentId: null, busy: false, error: "" });
      loadInviteStatus();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to update invite code.";
      setInviteMessage(message);
      setConfirmModal((prev) => ({ ...prev, error: message }));
    }
    finally { setInviteSaving(false); }
  };

  const handleInviteSave = async () => {
    const trimmed = inviteCode.trim();
    if (trimmed.length < 8) {
      setInviteMessage("Invite code must be at least 8 characters.");
      return;
    }
    setConfirmModal({
      open: true,
      type: "rotate_invite",
      departmentId: null,
      busy: false,
      error: "",
    });
  };

  const executeDepartmentDelete = async () => {
    if (!confirmModal.departmentId) return;
    setConfirmModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await deleteDepartment(confirmModal.departmentId);
      setConfirmModal({ open: false, type: "", departmentId: null, busy: false, error: "" });
      loadDepartments();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to delete department.";
      setDeptMessage(message);
      setConfirmModal((prev) => ({ ...prev, busy: false, error: message }));
      return;
    }
    setConfirmModal((prev) => ({ ...prev, busy: false }));
  };

  return (
    <div className="space-y-6">
      <PageHeaderCard
        icon={Shield}
        title="User & Department Management"
        subtitle="Assign department managers, rotate invite codes, and manage department profiles."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assign Department Manager */}
        <DashboardCard>
          <div className="mb-4 flex items-center gap-2">
            <Shield size={16} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Assign Department Manager</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Only the Sports Coordinator can assign department managers.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="email" placeholder="user@school.edu" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input name="department_search" placeholder="Search department (e.g. CITE)" className={inputCls} value={deptQuery} onChange={(e) => setDeptQuery(e.target.value)} />
            <select name="department_id" className={inputCls} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} disabled={deptLoading}>
              <option value="">{deptLoading ? "Loading..." : "Select department"}</option>
              {filteredDepartments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.department_name}</option>))}
            </select>
            <button disabled={loading} className={`w-full ${btnPrimary}`}>
              {loading ? "Assigning..." : "Assign Manager"}
            </button>
          </form>

          {message && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${message.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
              {message}
            </div>
          )}
        </DashboardCard>

        {/* Invite Code */}
        <DashboardCard>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={16} className="text-amber-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Sports Office Invite Code</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Rotate the code to control who can register in Sports Office.</p>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-slate-700 dark:text-slate-200">Status: <span className="font-semibold">{inviteLoading ? "Loading..." : inviteStatusLabel}</span></p>
            {inviteUpdatedAt && <p className="mt-0.5 text-slate-500 dark:text-slate-400">Last updated: {inviteUpdatedAt}</p>}
          </div>

          <div className="space-y-3">
            <input name="invite_code" placeholder="Enter new invite code" className={inputCls} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={generateInviteCode} className={btnGhost}>Generate Code</button>
              <button type="button" onClick={handleInviteSave} disabled={inviteSaving} className={btnPrimary}>
                {inviteSaving ? "Updating..." : "Set / Rotate Code"}
              </button>
            </div>
          </div>

          {inviteMessage && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${inviteMessage.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"}`}>
              {inviteMessage}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Departments */}
      <DashboardCard>
        <div className="mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Departments</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Create and manage departments for registration and filtering.</p>

        <form onSubmit={handleDeptCreate} className="grid gap-3 md:grid-cols-3">
          <input name="department_code" placeholder="Code (e.g. CITE)" className={inputCls} value={deptForm.department_code} onChange={(e) => setDeptForm({ ...deptForm, department_code: e.target.value })} />
          <input name="department_name" placeholder="Department Name" className={inputCls} value={deptForm.department_name} onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })} />
          <button className={btnPrimary}>Add Department</button>
        </form>

        {deptMessage && (
          <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${deptMessage.includes("created") || deptMessage.includes("updated") || deptMessage.includes("removed") ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"}`}>
            {deptMessage}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {departments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No departments found.</p>}
          {departments.map((dept) => (
            <div key={dept.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              {deptEditingId === dept.id ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <input className={inputCls} value={deptEditForm.department_code} onChange={(e) => setDeptEditForm({ ...deptEditForm, department_code: e.target.value })} />
                  <input className={inputCls} value={deptEditForm.department_name} onChange={(e) => setDeptEditForm({ ...deptEditForm, department_name: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={saveDeptEdit} className={btnPrimary}>Save</button>
                    <button onClick={cancelDeptEdit} className={btnGhost}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <DepartmentLogo imageUrl={dept.logo_url} label={dept.department_name || dept.department_code || "Department"} scale="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{dept.department_name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{dept.department_code}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                      {deptImageActionById[dept.id]?.loading ? "Uploading..." : dept.logo_url ? "Change Logo" : "Upload Logo"}
                      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" disabled={Boolean(deptImageActionById[dept.id]?.loading)}
                        onChange={(event) => { const file = event.target.files?.[0] || null; event.target.value = ""; handleDeptImageUpload(dept.id, file); }} />
                    </label>
                    {dept.logo_url && (
                      <button onClick={() => handleDeptImageRemove(dept.id)} disabled={Boolean(deptImageActionById[dept.id]?.loading)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Remove Logo
                      </button>
                    )}
                    <button onClick={() => startDeptEdit(dept)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      Edit
                    </button>
                    <button onClick={() => handleDeptDelete(dept.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </DashboardCard>

      <AppModal
        open={confirmModal.open}
        onClose={() => {
          if (confirmModal.busy || inviteSaving) return;
          setConfirmModal({ open: false, type: "", departmentId: null, busy: false, error: "" });
        }}
        title={confirmModal.type === "rotate_invite" ? "Rotate Invite Code" : "Delete Department"}
        subtitle={
          confirmModal.type === "rotate_invite"
            ? "This will invalidate the previous invite code immediately."
            : "This action removes the selected department."
        }
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {confirmModal.type === "rotate_invite"
              ? "Proceed with invite code rotation?"
              : "Delete this department now?"}
          </p>
          {confirmModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {confirmModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmModal({ open: false, type: "", departmentId: null, busy: false, error: "" })}
              disabled={confirmModal.busy || inviteSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmModal.type === "rotate_invite" ? executeInviteSave : executeDepartmentDelete}
              disabled={confirmModal.busy || inviteSaving}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                confirmModal.type === "rotate_invite" ? "bg-blue-600 hover:bg-blue-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {confirmModal.type === "rotate_invite"
                ? (inviteSaving ? "Updating..." : "Confirm Rotation")
                : (confirmModal.busy ? "Deleting..." : "Confirm Delete")}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default Users;
