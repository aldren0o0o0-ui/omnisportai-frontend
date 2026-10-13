import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import CoordinatorBrackets from "../coordinator/Brackets";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  readStoredDashboardTournamentSelection,
  writeStoredDashboardTournamentSelection,
} from "../../utils/dashboardTournamentSelection";

import { useWorkspace } from "../../context/WorkspaceContext";
import useIntramuralList from "../../hooks/useIntramuralList";

const FacilitatorBrackets = () => {
  const [searchParams] = useSearchParams();
  const { selectedIntramural, workspace } = useWorkspace();
  const { tournamentByWorkspace } = useIntramuralList();

  const queryTournamentId = searchParams.get("tournament_id");
  const storedSelection = readStoredDashboardTournamentSelection();
  const effectiveIntramural = selectedIntramural || workspace || null;
  const workspaceTournament = effectiveIntramural?.id
    ? tournamentByWorkspace[Number(effectiveIntramural.id)]
    : null;

  const targetTournamentId =
    queryTournamentId ||
    (workspaceTournament?.id ? String(workspaceTournament.id) : storedSelection?.id) ||
    undefined;

  useEffect(() => {
    if (workspaceTournament?.id) {
      writeStoredDashboardTournamentSelection({
        id: String(workspaceTournament.id),
        name: workspaceTournament.tournament_name || effectiveIntramural?.name || "",
      });
    }
  }, [workspaceTournament?.id, workspaceTournament?.tournament_name, effectiveIntramural?.name]);

  const access = useTournamentAccess(targetTournamentId);

  const assignedSportIds = useMemo(() => {
    const fromContext = (access.roleContexts || [])
      .filter((context) => String(context?.role || "").toLowerCase() === "sports_facilitator")
      .map((context) => Number(context?.sport_id || 0))
      .filter((sportId) => sportId > 0);
    return Array.from(new Set(fromContext));
  }, [access.roleContexts]);

  const hasAssignedSport = assignedSportIds.length > 0;
  const canOpenTallyBoard =
    hasAssignedSport &&
    (access.hasPermission("manage_assigned_live_scoring") ||
      access.isFacilitatorMode ||
      access.hasRoleContext("sports_facilitator"));

  let introContent = null;
  if (access.loading && !hasAssignedSport) {
    introContent = (
      <TournamentModeFallback
        title="Checking facilitator assignment"
        message="Loading your assigned sports for the selected intramural."
      />
    );
  }

  return (
    <CoordinatorBrackets
      tournamentId={targetTournamentId}
      readOnly={false}
      targetScopedManagement
      pageTitle="Tournament Brackets"
      pageSubtitle="Browse tournament brackets and manage operations for sports assigned to you."
      introContent={introContent}
      allowLiveScoringActions={canOpenTallyBoard}
      liveScoringSportIds={assignedSportIds}
      assignedSportIds={assignedSportIds}
      liveScoringBasePath="/sport-facilitator"
      matchViewerBasePath="/sport-facilitator"
    />
  );
};

export default FacilitatorBrackets;

