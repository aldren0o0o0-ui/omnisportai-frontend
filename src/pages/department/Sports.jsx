import Sports from "../coordinator/Sports";
import { useAuth } from "../../context/AuthContext";

const DepartmentSports = () => {
  const { user } = useAuth();
  const departmentId = user?.department_id || null;

  if (!departmentId) {
    return (
      <div className="text-slate-400">
        Department not set for this account.
      </div>
    );
  }

  return (
    <Sports
      readOnly
      departmentId={departmentId}
      directoryTitle="Department Sports"
      directorySubtitle="Showing only the sports and teams available for your department."
    />
  );
};

export default DepartmentSports;
