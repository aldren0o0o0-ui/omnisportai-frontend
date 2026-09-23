// import { useEffect, useMemo, useState } from "react";
// import AppModal from "../common/AppModal";

// import { getDepartments } from "../../services/departmentService";
// import { getSports } from "../../services/sportService";
// import { getTeams } from "../../services/teamService";
// import {
//   createTournament,
//   createTournamentProgramBlock,
// } from "../../services/tournamentService";
// import FormatSelector from "./FormatSelector";

// const DEFAULT_FORM = {
//   tournament_name: "",
//   sports_overview: "",
//   start_date: "",
//   end_date: "",
//   sport_ids: [],
//   department_ids: [],
//   tournament_type: "",
//   include_evening: false,
//   schedule_start_hour: 5,
//   schedule_end_hour: 18
// };

// const PROGRAM_BLOCK_TYPE_OPTIONS = [
//   "OPENING_PROGRAM",
//   "LUNCH_BREAK",
//   "CLOSING_CEREMONY",
//   "AWARDING",
//   "PREPARATION",
//   "CUSTOM",
// ];

// const EMPTY_PROGRAM_BLOCK_DRAFT = {
//   title: "",
//   block_type: "CUSTOM",
//   date: "",
//   start_time: "08:00",
//   end_time: "09:00",
//   is_recurring_daily: false,
//   description: "",
// };

// const formatProgramTypeLabel = (value) =>
//   String(value || "")
//     .toLowerCase()
//     .split("_")
//     .filter(Boolean)
//     .map((token) => token[0].toUpperCase() + token.slice(1))
//     .join(" ");

// const overlapsWindow = (leftStart, leftEnd, rightStart, rightEnd) =>
//   leftStart < rightEnd && leftEnd > rightStart;

// const buildDateTime = (dateText, timeText) => {
//   if (!dateText || !timeText) return null;
//   const parsed = new Date(`${dateText}T${timeText}:00`);
//   if (Number.isNaN(parsed.getTime())) return null;
//   return parsed;
// };

// const isSportsOfficeDepartment = (departmentName) =>
//   String(departmentName || "").trim().toLowerCase() === "sports office";

// const toHour = (rawValue, fallback, min, max) => {
//   const parsed = Number.parseInt(String(rawValue ?? ""), 10);
//   if (!Number.isInteger(parsed)) return fallback;
//   if (parsed < min || parsed > max) return fallback;
//   return parsed;
// };

// const toIntList = (rawValues) => {
//   const source = Array.isArray(rawValues) ? rawValues : [];
//   return Array.from(
//     new Set(
//       source
//         .map((value) => Number.parseInt(String(value), 10))
//         .filter((value) => Number.isInteger(value) && value > 0)
//     )
//   );
// };

// const TournamentForm = ({
//   onCreated,
//   onCancel = null,
//   asModalContent = false
// }) => {
//   const [sports, setSports] = useState([]);
//   const [teams, setTeams] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [form, setForm] = useState(DEFAULT_FORM);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [programBlocks, setProgramBlocks] = useState([]);
//   const [programBlockDraft, setProgramBlockDraft] = useState(
//     EMPTY_PROGRAM_BLOCK_DRAFT
//   );
//   const [overlapConfirmOpen, setOverlapConfirmOpen] = useState(false);
//   const [pendingProgramBlockDraft, setPendingProgramBlockDraft] = useState(null);
//   // Inline form feedback (replaces blocking alert() dialogs). tone: "error" | "success".
//   const [formMessage, setFormMessage] = useState(null);

//   useEffect(() => {
//     const fetchFormData = async () => {
//       try {
//         const [sportsData, teamsData, departmentsData] = await Promise.all([
//           getSports(),
//           getTeams(),
//           getDepartments()
//         ]);
//         setSports(Array.isArray(sportsData) ? sportsData : []);
//         setTeams(Array.isArray(teamsData) ? teamsData : []);
//         setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
//       } catch (error) {
//         console.error(error);
//         setSports([]);
//         setTeams([]);
//         setDepartments([]);
//       }
//     };

//     fetchFormData();
//   }, []);

//   const participantDepartments = useMemo(() => (
//     departments.filter((department) => !isSportsOfficeDepartment(department.department_name))
//   ), [departments]);

//   const allSportIds = useMemo(
//     () => toIntList(sports.map((sport) => sport.id)),
//     [sports]
//   );

//   const allDepartmentIds = useMemo(
//     () => toIntList(participantDepartments.map((department) => department.id)),
//     [participantDepartments]
//   );

//   const selectedSportIds = useMemo(
//     () => toIntList(form.sport_ids),
//     [form.sport_ids]
//   );

//   const selectedDepartmentIds = useMemo(
//     () => toIntList(form.department_ids),
//     [form.department_ids]
//   );

//   const autoSelectedTeamIds = useMemo(() => {
//     if (selectedSportIds.length === 0 || selectedDepartmentIds.length === 0) return [];
//     return toIntList(
//       teams
//         .filter((team) =>
//           selectedSportIds.includes(Number(team.sport_id)) &&
//           selectedDepartmentIds.includes(Number(team.department_id))
//         )
//         .map((team) => team.id)
//     );
//   }, [selectedDepartmentIds, selectedSportIds, teams]);

//   const selectedDepartmentNames = useMemo(() => {
//     const nameById = {};
//     participantDepartments.forEach((department) => {
//       nameById[department.id] = department.department_name;
//     });
//     return selectedDepartmentIds.map((id) => nameById[id] || "Unknown department");
//   }, [participantDepartments, selectedDepartmentIds]);

//   const normalizedHours = useMemo(() => {
//     const includeEvening = Boolean(form.include_evening);
//     const startHour = toHour(form.schedule_start_hour, 5, 0, 23);
//     const fallbackEnd = includeEvening ? 22 : 18;
//     const endHour = toHour(form.schedule_end_hour, fallbackEnd, 1, 24);
//     return { includeEvening, startHour, endHour };
//   }, [form.include_evening, form.schedule_end_hour, form.schedule_start_hour]);

//   const handleChange = (event) => {
//     const { name, value } = event.target;
//     setForm((prev) => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleToggleSport = (sportId, checked) => {
//     setForm((prev) => ({
//       ...prev,
//       sport_ids: checked
//         ? toIntList([...prev.sport_ids, sportId])
//         : toIntList(prev.sport_ids.filter((id) => id !== sportId))
//     }));
//   };

//   const handleToggleDepartment = (departmentId, checked) => {
//     setForm((prev) => ({
//       ...prev,
//       department_ids: checked
//         ? toIntList([...prev.department_ids, departmentId])
//         : toIntList(prev.department_ids.filter((id) => id !== departmentId))
//     }));
//   };

//   const handleIncludeEvening = (checked) => {
//     setForm((prev) => {
//       const endHour = toHour(prev.schedule_end_hour, checked ? 22 : 18, 1, 24);
//       return {
//         ...prev,
//         include_evening: checked,
//         schedule_end_hour: checked ? Math.max(endHour, 18) : Math.min(endHour, 18)
//       };
//     });
//   };

//   const applyProgramTemplate = (templateType) => {
//     const firstDay = form.start_date || "";
//     const lastDay = form.end_date || form.start_date || "";
//     if (templateType === "OPENING_PROGRAM") {
//       setProgramBlockDraft({
//         title: "Opening Program",
//         block_type: "OPENING_PROGRAM",
//         date: firstDay,
//         start_time: "08:00",
//         end_time: "10:00",
//         is_recurring_daily: false,
//         description: "Opening ceremony",
//       });
//       return;
//     }
//     if (templateType === "LUNCH_BREAK") {
//       setProgramBlockDraft({
//         title: "Lunch Break",
//         block_type: "LUNCH_BREAK",
//         date: "",
//         start_time: "12:00",
//         end_time: "13:00",
//         is_recurring_daily: true,
//         description: "",
//       });
//       return;
//     }
//     if (templateType === "CLOSING_CEREMONY") {
//       setProgramBlockDraft({
//         title: "Closing Ceremony",
//         block_type: "CLOSING_CEREMONY",
//         date: lastDay,
//         start_time: "15:00",
//         end_time: "16:00",
//         is_recurring_daily: false,
//         description: "",
//       });
//       return;
//     }
//     if (templateType === "AWARDING") {
//       setProgramBlockDraft({
//         title: "Awarding",
//         block_type: "AWARDING",
//         date: lastDay,
//         start_time: "16:00",
//         end_time: "17:00",
//         is_recurring_daily: false,
//         description: "",
//       });
//       return;
//     }
//     if (templateType === "PREPARATION") {
//       setProgramBlockDraft({
//         title: "Preparation Buffer",
//         block_type: "PREPARATION",
//         date: firstDay,
//         start_time: "09:30",
//         end_time: "10:00",
//         is_recurring_daily: false,
//         description: "",
//       });
//     }
//   };

//   const validateProgramBlockDraft = (draft) => {
//     if (!draft.title.trim()) return "Program block title is required.";
//     if (!PROGRAM_BLOCK_TYPE_OPTIONS.includes(String(draft.block_type))) {
//       return "Select a valid program block type.";
//     }
//     if (!draft.start_time || !draft.end_time) {
//       return "Program block start and end times are required.";
//     }
//     if (draft.start_time >= draft.end_time) {
//       return "Program block start time must be earlier than end time.";
//     }
//     if (!draft.is_recurring_daily) {
//       if (!draft.date) return "Program block date is required unless recurring daily.";
//       if (form.start_date && draft.date < form.start_date) {
//         return "Program block date must be within the tournament range.";
//       }
//       if (form.end_date && draft.date > form.end_date) {
//         return "Program block date must be within the tournament range.";
//       }
//     }
//     return null;
//   };

//   const handleAddProgramBlock = () => {
//     const validationError = validateProgramBlockDraft(programBlockDraft);
//     if (validationError) {
//       setFormMessage({ tone: "error", text: validationError });
//       return;
//     }
//     const draft = {
//       ...programBlockDraft,
//       title: programBlockDraft.title.trim(),
//       description: programBlockDraft.description.trim(),
//       date: programBlockDraft.is_recurring_daily ? "" : programBlockDraft.date,
//     };

//     const overlapping = (programBlocks || []).some((row) => {
//       const sameDay =
//         Boolean(draft.is_recurring_daily) ||
//         Boolean(row.is_recurring_daily) ||
//         String(row.date || "") === String(draft.date || "");
//       if (!sameDay) return false;
//       const leftStart = buildDateTime("2026-01-01", String(row.start_time || ""));
//       const leftEnd = buildDateTime("2026-01-01", String(row.end_time || ""));
//       const rightStart = buildDateTime("2026-01-01", String(draft.start_time || ""));
//       const rightEnd = buildDateTime("2026-01-01", String(draft.end_time || ""));
//       if (!leftStart || !leftEnd || !rightStart || !rightEnd) return false;
//       return overlapsWindow(leftStart, leftEnd, rightStart, rightEnd);
//     });
//     if (overlapping) {
//       setPendingProgramBlockDraft(draft);
//       setOverlapConfirmOpen(true);
//       return;
//     }

//     setProgramBlocks((prev) => [
//       ...prev,
//       {
//         ...draft,
//         local_id: `${Date.now()}-${Math.random()}`,
//       },
//     ]);
//     setProgramBlockDraft(EMPTY_PROGRAM_BLOCK_DRAFT);
//   };

//   const appendProgramBlockDraft = (draft) => {
//     if (!draft) return;
//     setProgramBlocks((prev) => [
//       ...prev,
//       {
//         ...draft,
//         local_id: `${Date.now()}-${Math.random()}`,
//       },
//     ]);
//     setProgramBlockDraft(EMPTY_PROGRAM_BLOCK_DRAFT);
//     setPendingProgramBlockDraft(null);
//     setOverlapConfirmOpen(false);
//   };

//   const handleRemoveProgramBlock = (localId) => {
//     setProgramBlocks((prev) => prev.filter((row) => row.local_id !== localId));
//   };

//   const handleReset = () => {
//     setForm(DEFAULT_FORM);
//     setProgramBlocks([]);
//     setProgramBlockDraft(EMPTY_PROGRAM_BLOCK_DRAFT);
//   };

//   const toggleAllSports = (checked) => {
//     setForm((prev) => ({
//       ...prev,
//       sport_ids: checked ? allSportIds : []
//     }));
//   };

//   const toggleAllDepartments = (checked) => {
//     setForm((prev) => ({
//       ...prev,
//       department_ids: checked ? allDepartmentIds : []
//     }));
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setFormMessage(null);

//     if (!form.tournament_name.trim()) {
//       setFormMessage({ tone: "error", text: "Tournament name is required." });
//       return;
//     }
//     if (form.sport_ids.length === 0) {
//       setFormMessage({ tone: "error", text: "Select at least one sport." });
//       return;
//     }
//     if (selectedDepartmentIds.length === 0) {
//       setFormMessage({ tone: "error", text: "Select at least one participating department." });
//       return;
//     }
//     if (!form.start_date || !form.end_date) {
//       setFormMessage({ tone: "error", text: "Tournament start date and end date are required." });
//       return;
//     }
//     if (form.end_date < form.start_date) {
//       setFormMessage({ tone: "error", text: "End date must be on or after start date." });
//       return;
//     }

//     const { includeEvening, startHour, endHour } = normalizedHours;
//     if (endHour <= startHour) {
//       setFormMessage({ tone: "error", text: "Schedule end hour must be later than the start hour." });
//       return;
//     }
//     if (!includeEvening && endHour > 18) {
//       setFormMessage({ tone: "error", text: "Enable evening schedule to allow an end hour later than 18:00." });
//       return;
//     }
//     if (autoSelectedTeamIds.length === 0) {
//       setFormMessage({ tone: "error", text: "No teams match the selected departments and sports." });
//       return;
//     }

//     const isAllDepartmentsSelected =
//       allDepartmentIds.length > 0 &&
//       selectedDepartmentIds.length === allDepartmentIds.length;

//     const payload = {
//       tournament_name: form.tournament_name.trim(),
//       sports_overview: form.sports_overview.trim() || null,
//       department_scope: isAllDepartmentsSelected ? "ALL_DEPARTMENTS" : "INTER_DEPARTMENT",
//       start_date: form.start_date,
//       end_date: form.end_date,
//       sport_ids: selectedSportIds,
//       tournament_type: form.tournament_type || null,
//       include_evening: includeEvening,
//       schedule_start_hour: startHour,
//       schedule_end_hour: endHour,
//       team_ids: autoSelectedTeamIds
//     };

//     setIsSubmitting(true);
//     try {
//       const createdTournament = await createTournament(payload);
//       const createdTournamentId = Number(createdTournament?.id || 0);
//       if (createdTournamentId > 0 && programBlocks.length > 0) {
//         await Promise.all(
//           programBlocks.map((block) =>
//             createTournamentProgramBlock(createdTournamentId, {
//               title: String(block.title || "").trim(),
//               block_type: String(block.block_type || "CUSTOM"),
//               date: block.is_recurring_daily ? null : block.date || null,
//               start_time: block.start_time,
//               end_time: block.end_time,
//               is_recurring_daily: Boolean(block.is_recurring_daily),
//               description: String(block.description || "").trim() || null,
//             })
//           )
//         );
//       }
//       handleReset();
//       setIsSubmitting(false);
//       onCreated?.();
//       setFormMessage({ tone: "success", text: "Tournament created." });
//       return;
//     } catch (error) {
//       const detail = error?.response?.data?.detail || "Failed to create tournament.";
//       setFormMessage({ tone: "error", text: detail });
//     }
//     setIsSubmitting(false);
//   };

//   const content = (
//     <form onSubmit={handleSubmit} className="space-y-5">
//       <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
//         <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
//           Basics
//         </h3>

//         <div className="grid gap-3 md:grid-cols-3">
//           <input
//             name="tournament_name"
//             placeholder="Tournament Name"
//             className="rounded-lg border"
//             onChange={handleChange}
//             value={form.tournament_name}
//           />

//           <input
//             name="sports_overview"
//             placeholder="Sports Overview (optional)"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
//             onChange={handleChange}
//             value={form.sports_overview}
//           />

//           <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
//             Departments:{" "}
//             <span className="font-semibold text-slate-100">
//               {selectedDepartmentIds.length}
//             </span>
//             <br />
//             Auto Teams:{" "}
//             <span className="font-semibold text-cyan-300">
//               {autoSelectedTeamIds.length}
//             </span>
//           </div>
//         </div>

//         <div className="grid gap-3 md:grid-cols-3">
//           <input
//             type="date"
//             name="start_date"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
//             onChange={handleChange}
//             value={form.start_date}
//           />

//           <input
//             type="date"
//             name="end_date"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
//             onChange={handleChange}
//             value={form.end_date}
//           />

//           <FormatSelector
//             onChange={handleChange}
//             value={form.tournament_type}
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
//           />
//         </div>
//       </section>

//       <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
//         <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
//           Schedule Policy
//         </h3>

//         <label className="inline-flex items-center gap-2 text-sm text-slate-300">
//           <input
//             type="checkbox"
//             checked={Boolean(form.include_evening)}
//             onChange={(event) => handleIncludeEvening(event.target.checked)}
//           />
//           Include evening schedule
//         </label>

//         <div className="grid gap-3 md:grid-cols-2">
//           <input
//             type="number"
//             min="0"
//             max="23"
//             name="schedule_start_hour"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
//             onChange={handleChange}
//             value={form.schedule_start_hour}
//             placeholder="Start hour (default 5)"
//           />
//           <input
//             type="number"
//             min="1"
//             max="24"
//             name="schedule_end_hour"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
//             onChange={handleChange}
//             value={form.schedule_end_hour}
//             placeholder={form.include_evening ? "End hour (default 22)" : "End hour (default 18)"}
//           />
//         </div>

//         <p className="text-xs text-slate-500">
//           Default tournament window is 05:00 to 18:00. Enable evening to extend beyond 18:00.
//         </p>
//       </section>

//       <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
//         <div className="flex flex-wrap items-center justify-between gap-2">
//           <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
//             Tournament Program
//           </h3>
//           <div className="flex flex-wrap gap-2">
//             {[
//               ["OPENING_PROGRAM", "Opening Program"],
//               ["LUNCH_BREAK", "Lunch Break"],
//               ["CLOSING_CEREMONY", "Closing Ceremony"],
//               ["AWARDING", "Awarding"],
//               ["PREPARATION", "Preparation"],
//             ].map(([type, label]) => (
//               <button
//                 key={type}
//                 type="button"
//                 onClick={() => applyProgramTemplate(type)}
//                 className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
//               >
//                 + {label}
//               </button>
//             ))}
//           </div>
//         </div>
//         <p className="text-xs text-slate-500">
//           Plan non-match activities the scheduler must avoid.
//         </p>

//         <div className="grid gap-2 md:grid-cols-7">
//           <input
//             type="text"
//             value={programBlockDraft.title}
//             onChange={(event) =>
//               setProgramBlockDraft((prev) => ({ ...prev, title: event.target.value }))
//             }
//             placeholder="Title"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-2"
//           />
//           <select
//             value={programBlockDraft.block_type}
//             onChange={(event) =>
//               setProgramBlockDraft((prev) => ({ ...prev, block_type: event.target.value }))
//             }
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
//           >
//             {PROGRAM_BLOCK_TYPE_OPTIONS.map((type) => (
//               <option key={type} value={type}>
//                 {formatProgramTypeLabel(type)}
//               </option>
//             ))}
//           </select>
//           <input
//             type="date"
//             value={programBlockDraft.date}
//             disabled={programBlockDraft.is_recurring_daily}
//             onChange={(event) =>
//               setProgramBlockDraft((prev) => ({ ...prev, date: event.target.value }))
//             }
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
//           />
//           <input
//             type="time"
//             value={programBlockDraft.start_time}
//             onChange={(event) =>
//               setProgramBlockDraft((prev) => ({ ...prev, start_time: event.target.value }))
//             }
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
//           />
//           <input
//             type="time"
//             value={programBlockDraft.end_time}
//             onChange={(event) =>
//               setProgramBlockDraft((prev) => ({ ...prev, end_time: event.target.value }))
//             }
//             className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
//           />
//           <button
//             type="button"
//             onClick={handleAddProgramBlock}
//             className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
//           >
//             Add Block
//           </button>
//         </div>
//         <label className="inline-flex items-center gap-2 text-xs text-slate-300">
//           <input
//             type="checkbox"
//             checked={Boolean(programBlockDraft.is_recurring_daily)}
//             onChange={(event) =>
//               setProgramBlockDraft((prev) => ({
//                 ...prev,
//                 is_recurring_daily: event.target.checked,
//               }))
//             }
//           />
//           Repeat daily
//         </label>
//         <textarea
//           value={programBlockDraft.description}
//           onChange={(event) =>
//             setProgramBlockDraft((prev) => ({ ...prev, description: event.target.value }))
//           }
//           placeholder="Description (optional)"
//           className="min-h-16 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
//         />

//         {programBlocks.length === 0 ? (
//           <p className="text-xs text-slate-500">No program blocks added yet.</p>
//         ) : (
//           <ul className="space-y-2">
//             {programBlocks.map((block) => (
//               <li
//                 key={block.local_id}
//                 className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
//               >
//                 <div>
//                   <p className="font-semibold">{block.title}</p>
//                   <p className="text-slate-400">
//                     {formatProgramTypeLabel(block.block_type)} |{" "}
//                     {block.is_recurring_daily ? "Daily" : block.date || "No date"} |{" "}
//                     {block.start_time} - {block.end_time}
//                   </p>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => handleRemoveProgramBlock(block.local_id)}
//                   className="rounded border border-rose-500/40 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10"
//                 >
//                   Remove
//                 </button>
//               </li>
//             ))}
//           </ul>
//         )}
//       </section>

//       <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
//         <div className="flex items-center justify-between gap-2">
//           <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
//             Participating Departments
//           </h3>
//           <label className="inline-flex items-center gap-2 text-xs text-slate-300">
//             <input
//               type="checkbox"
//               checked={allDepartmentIds.length > 0 && selectedDepartmentIds.length === allDepartmentIds.length}
//               onChange={(event) => toggleAllDepartments(event.target.checked)}
//             />
//             Select All Departments
//           </label>
//         </div>

//         {participantDepartments.length === 0 ? (
//           <p className="text-sm text-slate-500">No departments available.</p>
//         ) : (
//           <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
//             {participantDepartments.map((department) => (
//               <label
//                 key={department.id}
//                 className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
//               >
//                 <input
//                   type="checkbox"
//                   value={department.id}
//                   checked={selectedDepartmentIds.includes(department.id)}
//                   onChange={(event) =>
//                     handleToggleDepartment(department.id, event.target.checked)
//                   }
//                 />
//                 {department.department_name}
//               </label>
//             ))}
//           </div>
//         )}
//       </section>

//       <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
//         <div className="flex items-center justify-between gap-2">
//           <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
//             Sports
//           </h3>
//           <label className="inline-flex items-center gap-2 text-xs text-slate-300">
//             <input
//               type="checkbox"
//               checked={allSportIds.length > 0 && selectedSportIds.length === allSportIds.length}
//               onChange={(event) => toggleAllSports(event.target.checked)}
//             />
//             Select All Sports
//           </label>
//         </div>

//         {sports.length === 0 ? (
//           <p className="text-sm text-slate-500">No sports available.</p>
//         ) : (
//           <div className="grid gap-2 md:grid-cols-3">
//             {sports.map((sport) => (
//               <label
//                 key={sport.id}
//                 className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
//               >
//                 <input
//                   type="checkbox"
//                   value={sport.id}
//                   checked={selectedSportIds.includes(sport.id)}
//                   onChange={(event) => handleToggleSport(sport.id, event.target.checked)}
//                 />
//                 {sport.sport_name}
//               </label>
//             ))}
//           </div>
//         )}
//       </section>

//       <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
//         <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
//           Participant Summary
//         </h3>

//         {selectedDepartmentNames.length === 0 ? (
//           <p className="text-sm text-slate-500">No departments selected yet.</p>
//         ) : (
//           <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
//             <p className="font-semibold text-slate-100">
//               Selected Departments ({selectedDepartmentNames.length})
//             </p>
//             <p className="mt-1">
//               {selectedDepartmentNames.join(", ")}
//             </p>
//           </div>
//         )}
//         <p className="text-sm text-slate-400">
//           Teams auto-included based on selected departments and sports:{" "}
//           <span className="font-semibold text-cyan-300">{autoSelectedTeamIds.length}</span>
//         </p>
//       </section>

//       {formMessage ? (
//         <div
//           role="alert"
//           className={`rounded-lg border px-3 py-2 text-sm ${formMessage.tone === "success"
//             ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
//             : "border-rose-500/40 bg-rose-500/10 text-rose-300"
//             }`}
//         >
//           {formMessage.text}
//         </div>
//       ) : null}

//       <div className="flex flex-wrap justify-end gap-3">
//         {onCancel ? (
//           <button
//             type="button"
//             className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-200"
//             onClick={onCancel}
//             disabled={isSubmitting}
//           >
//             Cancel
//           </button>
//         ) : null}
//         <button
//           type="submit"
//           className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
//           disabled={isSubmitting}
//         >
//           {isSubmitting ? "Creating..." : "Create Intramural Event"}
//         </button>
//       </div>
//     </form>
//   );

//   const overlapModal = (
//     <AppModal
//       open={overlapConfirmOpen}
//       onClose={() => {
//         setOverlapConfirmOpen(false);
//         setPendingProgramBlockDraft(null);
//       }}
//       title="Overlapping Program Block"
//       subtitle="This time range overlaps with an existing block."
//       maxWidthClass="max-w-xl"
//     >
//       <div className="space-y-4">
//         <p className="text-sm text-slate-700 dark:text-slate-300">
//           Save this program block anyway?
//         </p>
//         <div className="flex justify-end gap-2">
//           <button
//             type="button"
//             onClick={() => {
//               setOverlapConfirmOpen(false);
//               setPendingProgramBlockDraft(null);
//             }}
//             className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
//           >
//             Cancel
//           </button>
//           <button
//             type="button"
//             onClick={() => appendProgramBlockDraft(pendingProgramBlockDraft)}
//             className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
//           >
//             Save Anyway
//           </button>
//         </div>
//       </div>
//     </AppModal>
//   );

//   if (asModalContent) {
//     return (
//       <>
//         {content}
//         {overlapModal}
//       </>
//     );
//   }

//   return (
//     <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
//       <h2 className="mb-4 text-xl font-bold">Create Intramural Event</h2>
//       {content}
//       {overlapModal}
//     </div>
//   );
// };

// export default TournamentForm;
