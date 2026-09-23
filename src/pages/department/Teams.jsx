import { useAuth } from "../../context/AuthContext";
import Teams from "../coordinator/Teams";

const DepartmentTeams = () => {
  const { user } = useAuth();
  const departmentId = user?.department_id || null;

  if (!departmentId) {
    return (
      <div className="text-slate-400">
        Department not set for this account.
      </div>
    );
  }

  return <Teams departmentId={departmentId} allowCoachAssignment />;
};

export default DepartmentTeams;
