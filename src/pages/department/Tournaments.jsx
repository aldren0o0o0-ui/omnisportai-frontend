import { IntramuralGallery } from "../../components/intramural";

const DepartmentTournaments = () => {

  return (
    <div className="os-themed-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Intramurals</h1>
        <p className="text-sm text-[var(--text-muted)]">
          View intramural events and track your department&apos;s participation. Creation and scheduling are managed by the Sports Coordinator.
        </p>
      </div>

      <IntramuralGallery />
    </div>
  );
};

export default DepartmentTournaments;
