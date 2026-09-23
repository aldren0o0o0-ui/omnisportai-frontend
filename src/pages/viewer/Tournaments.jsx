import { IntramuralGallery } from "../../components/intramural";
import { useAuth } from "../../context/AuthContext";

const ViewerTournaments = () => {
  const { user } = useAuth();
  const departmentLabel = user?.department_name || user?.department_code || user?.department_id;

  return (
    <div className="os-themed-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Intramurals</h1>
        <p className="text-sm text-[var(--text-muted)]">Select an intramural to view its sports and event information.</p>
      </div>
      {departmentLabel && (
        <div className="text-sm text-[var(--text-muted)]">Department: {departmentLabel}</div>
      )}
      <IntramuralGallery />
    </div>
  );
};

export default ViewerTournaments;
