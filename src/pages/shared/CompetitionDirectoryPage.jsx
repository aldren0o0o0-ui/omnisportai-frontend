import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UsersRound } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getCompetitionDirectory } from "../../services/competitionDirectoryService";
import { getTournaments } from "../../services/tournamentService";
import EntityIdentityHeader from "../../components/directory/EntityIdentityHeader";
import DirectoryFilters from "../../components/directory/DirectoryFilters";
import EventCenteredCompetitionDirectory from "../../components/directory/EventCenteredCompetitionDirectory";
import DepartmentEditModal from "../../components/directory/DepartmentEditModal";
import EntryEditModal from "../../components/directory/EntryEditModal";
import SportEditModal from "../../components/directory/SportEditModal";
import TeamDetailsDrawer from "../../components/dashboard/TeamDetailsDrawer";
import {
  getRoleScopeTabs,
  normalizeRole,
  canEditDepartment,
  canEditSport,
  canEditEntry,
} from "../../utils/ownershipCapabilities";
import { filterSportGroupsToCoachContexts } from "./competitionDirectoryPresentation";

const EMPTY_LIST = [];

const chooseTournament = (rows) => {
  const items = Array.isArray(rows) ? rows : [];
  return (
    items.find((row) => String(row?.lifecycle_status || "").toUpperCase() === "STARTED") ||
    items.find((row) => row?.is_started) ||
    items.find((row) => !row?.is_archived) ||
    items[0] ||
    null
  );
};

export const CompetitionDirectoryPage = () => {
  const { selectedIntramural } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspaceId = Number(selectedIntramural?.id || 0);
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [sportId, setSportId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [participantShape, setParticipantShape] = useState("");
  const [status, setStatus] = useState(() => String(searchParams.get("status") || "").toUpperCase());
  const [scopeTab, setScopeTab] = useState(() => searchParams.get("scope") === "all" ? "all" : "owned");

  // Modals / Drawer State
  const [selectedDrawerEntry, setSelectedDrawerEntry] = useState(null);
  const [departmentEditorOpen, setDepartmentEditorOpen] = useState(false);
  const [entryEditorTarget, setEntryEditorTarget] = useState(null);
  const [sportEditorTarget, setSportEditorTarget] = useState(null);

  const tournamentsQuery = useQuery({
    queryKey: ["competition-directory", "tournaments", workspaceId],
    queryFn: () => getTournaments({ workspaceId }),
    enabled: workspaceId > 0,
  });

  const selectedTournament = useMemo(
    () => chooseTournament(tournamentsQuery.data),
    [tournamentsQuery.data]
  );
  const tournamentId = Number(selectedTournament?.id || 0);
  const tournamentAccess = useTournamentAccess(tournamentId || undefined);
  const effectiveMode = normalizeRole(tournamentAccess.effectiveMode || user?.role || "viewer");
  const roleContexts = Array.isArray(tournamentAccess.roleContexts)
    ? tournamentAccess.roleContexts
    : EMPTY_LIST;

  const scopeTabs = useMemo(() => getRoleScopeTabs(effectiveMode), [effectiveMode]);
  const identityHeaderOwnsPageTitle = ["sports_coordinator", "admin", "super_admin", "viewer", "player"]
    .includes(effectiveMode);

  // Query competition directory
  const directoryQuery = useQuery({
    queryKey: [
      "competition-directory",
      workspaceId,
      tournamentId,
      search,
      sportId,
      departmentId,
      participantShape,
    ],
    queryFn: () =>
      getCompetitionDirectory({
        workspaceId,
        tournamentId,
        search,
        sportId,
        departmentId,
        participantShape,
        page: 1,
        pageSize: 50,
      }),
    enabled: workspaceId > 0 && tournamentId > 0,
  });

  const directoryData = directoryQuery.data;
  const { participants, priorityParticipants, departmentsList, sportsList } = useMemo(() => ({
    participants: Array.isArray(directoryData?.participants) ? directoryData.participants : [],
    priorityParticipants: Array.isArray(directoryData?.priority_participants)
      ? directoryData.priority_participants
      : [],
    departmentsList: Array.isArray(directoryData?.departments) ? directoryData.departments : [],
    sportsList: Array.isArray(directoryData?.sports) ? directoryData.sports : [],
  }), [directoryData]);

  const participantById = useMemo(
    () => new Map(participants.map((participant) => [Number(participant.entry_id), participant])),
    [participants]
  );

  const sportGroups = useMemo(() => {
    const groups = Array.isArray(directoryData?.sport_groups) ? directoryData.sport_groups : [];
    const statusFiltered = !status ? groups : groups.map((sport) => ({
      ...sport,
      events: (sport.events || []).map((event) => ({
        ...event,
        departments: (event.departments || []).map((department) => ({
          ...department,
          entries: (department.entries || []).filter((entry) => String(entry.status || "").toUpperCase() === status),
        })).filter((department) => status === "NO_ENTRY"
          ? Number(department.created_count || 0) === 0
          : department.entries.length > 0),
      })).filter((event) => event.departments.length > 0),
    })).filter((sport) => sport.events.length > 0);
    if (!(scopeTabs.length > 0 && scopeTab === "owned")) return statusFiltered;
    if (effectiveMode === "department_manager") {
      const ownIds = new Set(roleContexts
        .filter((context) => normalizeRole(context?.role) === "department_manager")
        .map((context) => Number(context?.department_id || 0))
        .filter(Boolean));
      const fallbackId = Number(user?.department_id || user?.departmentId || 0);
      if (!ownIds.size && fallbackId) ownIds.add(fallbackId);
      return statusFiltered.map((sport) => ({
        ...sport,
        events: (sport.events || []).map((event) => ({
          ...event,
          departments: (event.departments || []).filter((department) => ownIds.has(Number(department.department_id))),
        })).filter((event) => event.departments.length > 0),
      })).filter((sport) => sport.events.length > 0);
    }
    if (effectiveMode === "sports_facilitator") {
      const ownSportIds = new Set(roleContexts
        .filter((context) => normalizeRole(context?.role) === "sports_facilitator")
        .map((context) => Number(context?.sport_id || 0))
        .filter(Boolean));
      const fallbackId = Number(user?.sport_id || user?.sportId || 0);
      if (!ownSportIds.size && fallbackId) ownSportIds.add(fallbackId);
      return statusFiltered.filter((sport) => ownSportIds.has(Number(sport.sport_id)));
    }
    if (["coach", "assistant_coach"].includes(effectiveMode)) {
      const priorityIds = new Set(priorityParticipants.map((participant) => Number(participant.entry_id)));
      return filterSportGroupsToCoachContexts({
        sportGroups: statusFiltered,
        roleContexts,
        priorityEntryIds: priorityIds,
      });
    }
    return statusFiltered;
  }, [directoryData, effectiveMode, priorityParticipants, roleContexts, scopeTab, scopeTabs.length, status, user]);

  // Own department resolution for Department Manager
  const ownDepartment = useMemo(() => {
    const userDeptId = Number(user?.department_id || user?.departmentId);
    return (
      departmentsList.find((d) => Number(d.department_id || d.id) === userDeptId) ||
      (userDeptId ? { department_id: userDeptId, department_name: "My Department" } : null)
    );
  }, [departmentsList, user]);

  // Primary assigned entry for Coach
  const primaryCoachEntry = useMemo(() => {
    return priorityParticipants[0] || participants.find((p) => p.capabilities?.can_edit_name) || null;
  }, [priorityParticipants, participants]);

  // Primary facilitated sport for Facilitator
  const primaryFacilitatorSport = useMemo(() => {
    const userSportId = Number(user?.sport_id || user?.sportId);
    return sportsList.find((s) => Number(s.sport_id || s.id) === userSportId) || sportsList[0] || null;
  }, [sportsList, user]);

  // Stats calculation for header
  const headerStats = useMemo(() => {
    if (effectiveMode === "department_manager") {
      const userDeptId = Number(user?.department_id || user?.departmentId);
      const deptEntries = participants.filter((p) => Number(p.department_id) === userDeptId);
      const playersCount = deptEntries.reduce((sum, e) => sum + (e.members?.length || 0), 0);
      const uniqueSports = new Set(deptEntries.map((e) => Number(e.sport_id))).size;
      return {
        entriesCount: deptEntries.length,
        playersCount,
        sportsCount: uniqueSports,
      };
    }
    if (effectiveMode === "sports_facilitator" && primaryFacilitatorSport) {
      const sportEntries = participants.filter(
        (p) => Number(p.sport_id) === Number(primaryFacilitatorSport.sport_id || primaryFacilitatorSport.id)
      );
      const playersCount = sportEntries.reduce((sum, e) => sum + (e.members?.length || 0), 0);
      return {
        entriesCount: sportEntries.length,
        playersCount,
      };
    }
    return {};
  }, [effectiveMode, user, participants, primaryFacilitatorSport]);

  const handleRefetch = async () => {
    await directoryQuery.refetch();
  };

  const handleOpenEntry = (entry) => {
    setSelectedDrawerEntry({
      ...entry,
      entryId: entry.entry_id || entry.id,
      registrationId: entry.registration_id,
      source_type: entry.source_type,
      teamId: entry.team_id,
      sportId: entry.sport_id,
      eventId: entry.tournament_sport_event_id,
      name: entry.display_name || entry.entry_name,
      imageUrl: entry.image_url,
      sport_name: entry.sport_name,
      department_name: entry.department_name,
      department_code: entry.department_code,
      coach_name: entry.coach?.display_name,
      status: entry.public_status || entry.status || "APPROVED",
      can_review: Boolean(entry.can_review || entry.capabilities?.can_review),
      participant_shape: entry.participant_shape,
      groupEntries: [entry],
    });
  };

  const noIntramural = workspaceId <= 0;
  const noTournament = !tournamentsQuery.isLoading && workspaceId > 0 && tournamentId <= 0;

  return (
    <main className="os-page-shell space-y-5">
      {/* 1. Entity Identity Header */}
      {effectiveMode !== "sports_facilitator" ? <EntityIdentityHeader
        effectiveMode={effectiveMode}
        department={ownDepartment}
        entry={primaryCoachEntry}
        sport={primaryFacilitatorSport}
        stats={headerStats}
        onEditDepartment={
          canEditDepartment(user, ownDepartment, effectiveMode)
            ? () => setDepartmentEditorOpen(true)
            : null
        }
        onEditEntry={
          primaryCoachEntry && canEditEntry(user, primaryCoachEntry, effectiveMode)
            ? () => setEntryEditorTarget(primaryCoachEntry)
            : null
        }
        onEditSport={
          primaryFacilitatorSport && canEditSport(user, primaryFacilitatorSport, effectiveMode, [primaryFacilitatorSport.sport_id || primaryFacilitatorSport.id])
            ? () => setSportEditorTarget(primaryFacilitatorSport)
            : null
        }
      /> : null}

      {noIntramural ? (
        <EmptyState
          title="Select an Intramural"
          message="Choose an Intramural to view its teams and entries."
          icon={UsersRound}
        />
      ) : noTournament ? (
        <EmptyState
          title="No competition available"
          message="The selected Intramural does not have a competition yet."
          icon={UsersRound}
        />
      ) : (
        <>
          {!identityHeaderOwnsPageTitle ? (
            <div>
              <h1 className="text-xl font-bold text-[var(--text-main)]">Teams &amp; Entries</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{effectiveMode === "sports_facilitator" ? "Review and manage entries across your assigned sports." : "Track configured events and department participation across this Intramural."}</p>
            </div>
          ) : null}
          {/* 2. Scope Tabs (Role Navigation) */}
          {scopeTabs.length > 0 ? (
            <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-1">
              {scopeTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeTab(tab.id)}
                  className={`relative px-4 py-2 text-xs font-bold transition rounded-xl ${
                    scopeTab === tab.id
                      ? "bg-[var(--surface-soft)] text-[var(--primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {/* 3. Compact Filter Toolbar */}
          <DirectoryFilters
            search={search}
            onSearchChange={setSearch}
            sportId={sportId}
            onSportChange={setSportId}
            departmentId={departmentId}
            onDepartmentChange={setDepartmentId}
            participantShape={participantShape}
            onParticipantShapeChange={setParticipantShape}
            status={status}
            onStatusChange={setStatus}
            sports={sportsList}
            departments={departmentsList}
            hideDepartmentFilter={scopeTabs.length > 0 && scopeTab === "owned" && effectiveMode === "department_manager"}
            hideSportFilter={scopeTabs.length > 0 && scopeTab === "owned" && effectiveMode === "sports_facilitator"}
          />

          {/* 4. Directory List */}
          {directoryQuery.isLoading ? (
            <div className="space-y-2.5" role="status" aria-label="Loading teams and entries">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-[var(--surface-muted)] motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : (
            <EventCenteredCompetitionDirectory
              sportGroups={sportGroups}
              participantById={participantById}
              onOpenEntry={handleOpenEntry}
              viewerMode={effectiveMode}
              onResubmitEntry={!["coach", "assistant_coach"].includes(effectiveMode)
                ? undefined
                : () => navigate("/coach/player-applications")}
              emptyTitle={scopeTab === "owned" && ["coach", "assistant_coach"].includes(effectiveMode)
                ? "No assigned competition events"
                : undefined}
              emptyMessage={scopeTab === "owned" && ["coach", "assistant_coach"].includes(effectiveMode)
                ? "No team or entry target is assigned to you in this Intramural."
                : undefined}
            />
          )}
        </>
      )}

      {/* 5. Unified Entry Side Drawer */}
      <TeamDetailsDrawer
        isOpen={Boolean(selectedDrawerEntry)}
        onClose={() => setSelectedDrawerEntry(null)}
        entry={selectedDrawerEntry}
        tournamentId={tournamentId}
        isMyDepartment={
          effectiveMode === "sports_coordinator" ||
          (effectiveMode === "department_manager" &&
            Number(user?.department_id) === Number(selectedDrawerEntry?.department_id))
        }
        onEntryChanged={handleRefetch}
      />

      {/* 6. Edit Modals */}
      <DepartmentEditModal
        open={departmentEditorOpen}
        onClose={() => setDepartmentEditorOpen(false)}
        department={ownDepartment}
        onSuccess={handleRefetch}
      />

      <EntryEditModal
        open={Boolean(entryEditorTarget)}
        onClose={() => setEntryEditorTarget(null)}
        entry={entryEditorTarget}
        onSuccess={handleRefetch}
      />

      <SportEditModal
        open={Boolean(sportEditorTarget)}
        onClose={() => setSportEditorTarget(null)}
        sport={sportEditorTarget}
        onSuccess={handleRefetch}
      />
    </main>
  );
};

export default CompetitionDirectoryPage;
