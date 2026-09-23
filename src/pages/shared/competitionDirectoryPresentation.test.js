import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getDirectoryPriority,
  filterSportGroupsToCoachContexts,
  groupParticipantsBySportEvent,
  participantTypeLabel,
} from "./competitionDirectoryPresentation.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const participants = [
  { entry_id: 1, team_id: 9, department_id: 2, sport_id: 4, tournament_sport_event_id: 7, participant_shape: "TEAM", sport_name: "Basketball", event_name: "Men" },
  { entry_id: 2, department_id: 3, sport_id: 5, tournament_sport_event_id: 8, participant_shape: "SOLO", sport_name: "Badminton", event_name: "Singles" },
  { entry_id: 3, department_id: 3, sport_id: 5, tournament_sport_event_id: 9, participant_shape: "DUO", sport_name: "Badminton", event_name: "Doubles", is_current_user_entry: true },
];

test("role priority keeps one shared browse list without duplicates", () => {
  const coach = getDirectoryPriority({
    participants,
    effectiveMode: "coach",
    roleContexts: [{ role: "coach", department_id: 2, sport_id: 4, team_id: 9 }],
  });
  assert.deepEqual(coach.participants.map((row) => row.entry_id), [1]);
  assert.deepEqual(coach.browse.map((row) => row.entry_id), [2, 3]);
  assert.equal(new Set([...coach.participants, ...coach.browse].map((row) => row.entry_id)).size, 3);
});

test("player, department, and facilitator priorities use exact selected-Intramural scope", () => {
  assert.deepEqual(getDirectoryPriority({ participants, effectiveMode: "player" }).participants.map((row) => row.entry_id), [3]);
  assert.deepEqual(getDirectoryPriority({
    participants,
    effectiveMode: "department_manager",
    roleContexts: [{ role: "department_manager", department_id: 3 }],
  }).participants.map((row) => row.entry_id), [2, 3]);
  assert.deepEqual(getDirectoryPriority({
    participants,
    effectiveMode: "sports_facilitator",
    roleContexts: [{ role: "sports_facilitator", sport_id: 5 }],
  }).participants.map((row) => row.entry_id), [2, 3]);
});

test("department priority includes every participant shape even when its access context has legacy team fields", () => {
  const priority = getDirectoryPriority({
    participants,
    effectiveMode: "department_manager",
    roleContexts: [{
      role: "department_manager",
      department_id: 3,
      team_id: 999,
      participant_shape: "TEAM",
    }],
  });
  assert.deepEqual(priority.participants.map((row) => row.entry_id), [2, 3]);
});

test("viewer grouping is Sport then Event and duplicate-free", () => {
  const groups = groupParticipantsBySportEvent([...participants, participants[0]]);
  assert.equal(groups.length, 3);
  assert.equal(groups.flatMap((group) => group.participants).length, 3);
  assert.equal(participantTypeLabel("SOLO"), "Singles");
  assert.equal(participantTypeLabel("DUO"), "Doubles");
});

test("coach owned scope retains an assigned configured event before an entry exists", () => {
  const groups = [{
    sport_id: 4,
    events: [{
      event_id: 93,
      departments: [
        { department_id: 1, capacity: 1, entries: [] },
        { department_id: 2, capacity: 1, entries: [{ entry_id: 143, team_id: 70 }] },
      ],
    }],
  }];
  const result = filterSportGroupsToCoachContexts({
    sportGroups: groups,
    roleContexts: [{
      role: "coach",
      department_id: 1,
      sport_id: 4,
      tournament_sport_event_id: 93,
      team_id: 69,
    }],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].events.length, 1);
  assert.equal(result[0].events[0].departments.length, 1);
  assert.equal(result[0].events[0].departments[0].department_id, 1);
  assert.deepEqual(result[0].events[0].departments[0].entries, []);
});

test("event-centered directory renders configured structure and derived empty slots", () => {
  const component = read("../../components/directory/EventCenteredCompetitionDirectory.jsx");
  assert.match(component, /sport\.events/);
  assert.match(component, /event\.departments/);
  assert.match(component, /No entr(?:y|ies) yet/);
  assert.match(component, /department\.capacity/);
  assert.match(component, /submitted_department_count/);
  assert.match(component, /sport\.events\?\.length/);
  assert.match(component, /key={event\.event_id}/);
  assert.match(component, /role="table"/);
  assert.match(component, /Department/);
  assert.match(component, /Entry \/ Team/);
  assert.match(component, /const actionLabel = canResubmit \? "Resubmit"/);
  assert.match(component, /isCoach && status === "APPROVED"/);
  assert.match(component, /REVISION_REQUESTED: "Needs Changes"/);
  assert.match(component, /shape === "DUO"/);
  assert.match(component, /2 athletes per pair/);
  assert.doesNotMatch(component, /default_event_categories|SportTemplateRegistry/);
});

test("event tables keep decisions in the existing lazy review drawer", () => {
  const component = read("../../components/directory/EventCenteredCompetitionDirectory.jsx");
  const drawer = read("../../components/dashboard/TeamDetailsDrawer.jsx");
  const filters = read("../../components/directory/DirectoryFilters.jsx");
  assert.match(component, /No action/);
  assert.doesNotMatch(component, />Approve<|>Reject<|>Needs changes</);
  assert.match(drawer, />Reject</);
  assert.match(drawer, />Needs changes</);
  assert.match(drawer, />Approve</);
  assert.match(filters, /value="PENDING_REVIEW"/);
  assert.match(filters, /value="REVISION_REQUESTED"/);
});

test("pending TournamentTeam registrations use the consolidated review drawer", () => {
  const directory = read("../../components/directory/EventCenteredCompetitionDirectory.jsx");
  const page = read("./CompetitionDirectoryPage.jsx");
  const drawer = read("../../components/dashboard/TeamDetailsDrawer.jsx");

  assert.match(directory, /team-registration-/);
  assert.match(page, /registrationId: entry\.registration_id/);
  assert.match(drawer, /getTournamentTeamRegistrationDetail/);
  assert.match(drawer, /reviewTournamentTeamRegistration/);
  assert.match(drawer, /TOURNAMENT_TEAM_REGISTRATION/);
  assert.match(drawer, /z-\[var\(--z-overlay\)\]/);
  assert.match(drawer, /setReviewAction\("REJECT"\)/);
  assert.match(drawer, /setReviewAction\("REQUEST_REVISION"\)/);
  assert.match(drawer, /setReviewAction\("APPROVE"\)/);
  assert.match(drawer, /reviewTournamentTeamRegistration/);
});

test("main directory keeps rosters lazy without duplicating lifecycle guidance", () => {
  const page = read("./CompetitionDirectoryPage.jsx");
  const service = read("../../services/competitionDirectoryService.js");
  assert.doesNotMatch(page, /Registration is open\. New entries will appear/);
  assert.match(page, /status={status}/);
  assert.match(service, /includeMembers = false/);
  assert.match(service, /include_members: Boolean\(includeMembers\)/);
});

test("the shared page avoids a duplicate directory title for its global identity header", () => {
  const page = read("./CompetitionDirectoryPage.jsx");
  const header = read("../../components/directory/EntityIdentityHeader.jsx");
  assert.match(page, /identityHeaderOwnsPageTitle/);
  assert.match(header, /Track configured events and department participation across this Intramural/);
});

test("facilitator approvals are consolidated into the event-centered directory", () => {
  const page = read("./CompetitionDirectoryPage.jsx");
  const eventDirectory = read("../../components/directory/EventCenteredCompetitionDirectory.jsx");
  const drawer = read("../../components/dashboard/TeamDetailsDrawer.jsx");
  const app = read("../../App.jsx");
  const sidebar = read("../../components/Sidebar/sportFacilitatorSidebarConfig.js");

  assert.match(page, /status=PENDING_REVIEW|searchParams\.get\("status"\)/);
  assert.match(eventDirectory, /entry\.can_review/);
  assert.match(eventDirectory, /actionLabel/);
  assert.match(drawer, /approveEntry/);
  assert.match(drawer, /rejectEntry/);
  assert.match(drawer, /requestEntryChanges/);
  assert.match(drawer, /EntryReviewModal/);
  assert.match(app, /teams-and-players\?status=PENDING_REVIEW/);
  assert.doesNotMatch(app, /PendingRegistrations|Pending_Registration/);
  assert.doesNotMatch(sidebar, /Entry Approvals/);
});
