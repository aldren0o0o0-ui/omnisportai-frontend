import { useEffect, useMemo, useState } from "react";

import { getDepartments } from "../../services/departmentService";
import { getTeams } from "../../services/teamService";

const TeamSelector = ({
  selectedTeamIds,
  onSelectionChange,
  asModalContent = false
}) => {
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const safeSelected = Array.isArray(selectedTeamIds) ? selectedTeamIds : [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsData, departmentData] = await Promise.all([
          getTeams(),
          getDepartments()
        ]);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setDepartments(Array.isArray(departmentData) ? departmentData : []);
      } catch (error) {
        console.error(error);
        setTeams([]);
        setDepartments([]);
      }
    };

    fetchData();
  }, []);

  const departmentById = useMemo(() => {
    const map = {};
    departments.forEach((department) => {
      map[department.id] = department.department_name;
    });
    return map;
  }, [departments]);

  const toggleTeam = (teamId) => {
    if (!onSelectionChange) return;
    if (safeSelected.includes(teamId)) {
      onSelectionChange(safeSelected.filter((id) => id !== teamId));
      return;
    }
    onSelectionChange([...safeSelected, teamId]);
  };

  const content = (
    <>
      {teams.length === 0 ? (
        <div className="text-sm text-slate-500">No teams available.</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <label
              key={team.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                safeSelected.includes(team.id)
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={safeSelected.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
              />
              <div>
                <div className="font-medium">{team.team_name}</div>
                <div className="text-xs text-slate-400">
                  {departmentById[team.department_id] || team.department_id || "-"}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </>
  );

  if (asModalContent) {
    return (
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Teams
          </h3>
          <span className="text-xs text-slate-500">
            Selected: {safeSelected.length}
          </span>
        </div>
        {content}
      </section>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-4 text-xl font-bold">Add Teams</h2>
      {content}
    </div>
  );
};

export default TeamSelector;
