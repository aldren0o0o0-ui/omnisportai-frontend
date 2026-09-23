import { IntramuralGallery } from "../../components/intramural";

const FacilitatorTournaments = () => {
  return (
    <div className="os-themed-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Intramurals</h1>
        <p className="text-sm text-[var(--text-muted)]">
          View intramural event information and timeline for your assigned facilitator scope.
        </p>
      </div>

      <IntramuralGallery />
    </div>
  );
};

export default FacilitatorTournaments;
