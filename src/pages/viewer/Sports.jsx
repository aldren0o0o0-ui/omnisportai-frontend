import Sports from "../coordinator/Sports";
import { useAuth } from "../../context/AuthContext";

const ViewerSports = () => {
  const { user } = useAuth();
  const departmentLabel = user?.department_name || user?.department_code || user?.department_id;
  return (
    <div className="space-y-4">
      {departmentLabel && (
        <div className="text-slate-400 text-sm">Department: {departmentLabel}</div>
      )}
      <Sports readOnly />
    </div>
  );
};

export default ViewerSports;
