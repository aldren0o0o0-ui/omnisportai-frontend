import useIntramuralList from "../../hooks/useIntramuralList";
import { useWorkspace } from "../../context/WorkspaceContext";
import IntramuralCard from "./IntramuralCard";

const IntramuralGallery = () => {
  const { intramurals, tournamentByWorkspace, loading } = useIntramuralList();
  const { selectedIntramural, selectIntramural } = useWorkspace();

  if (loading) {
    return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>;
  }
  if (!intramurals.length) {
    return <div className="rounded-2xl border border-dashed border-[var(--border-soft)] p-10 text-center text-sm text-[var(--text-muted)]">No intramurals are available.</div>;
  }

  return (
    <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
      {intramurals.map((intramural) => {
        const tournament = tournamentByWorkspace[Number(intramural.id)] || null;
        const selected = Number(selectedIntramural?.id) === Number(intramural.id);
        return <IntramuralCard key={intramural.id} intramural={intramural} tournament={tournament} selected={selected} onOpen={() => selectIntramural({ ...intramural, tournament_id: tournament?.id || null })} />;
      })}
    </div>
  );
};

export default IntramuralGallery;
