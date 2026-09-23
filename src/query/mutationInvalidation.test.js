import assert from "node:assert/strict";
import test from "node:test";

import { affectsCompetitionReads, affectsScheduleData, affectsTournamentAccess, competitionMutationTournamentId } from "./mutationInvalidation.js";

test("authority-changing assignment mutations invalidate tournament access", () => {
  const urls = [
    "/admin/role-assignments",
    "/admin/users/18/status",
    "/intramurals/3/sports/9/facilitators",
    "/tournaments/3/department-coach-assignments/EVENT/12",
    "/tournaments/3/assistant-coaches/7",
    "/teams/44/assign-coach",
  ];
  for (const url of urls) {
    assert.equal(affectsTournamentAccess({ method: "patch", url }), true, url);
  }
});

test("reads and unrelated competition mutations do not invalidate access", () => {
  assert.equal(
    affectsTournamentAccess({ method: "get", url: "/admin/role-assignments" }),
    false
  );
  assert.equal(
    affectsTournamentAccess({ method: "post", url: "/competition-entries/12/approve" }),
    false
  );
});

test("schedule and venue mutations invalidate schedule data only when relevant", () => {
  for (const url of [
    "/tournaments/3/schedule/generate",
    "/tournaments/3/program-blocks/4",
    "/venues/2/availability",
    "/tournaments/3/venues",
  ]) {
    assert.equal(affectsScheduleData({ method: "post", url }), true, url);
  }
  assert.equal(
    affectsScheduleData({ method: "post", url: "/competition-entries/12/approve" }),
    false,
  );
  assert.equal(
    affectsScheduleData({ method: "get", url: "/tournaments/3/schedule/events" }),
    false,
  );
});

test("entry and ownership mutations invalidate both participant read models", () => {
  for (const url of [
    "/competition-entries/12/approve",
    "/tournaments/3/team-registrations",
    "/team-applications/91/confirm-player",
    "/entry-pools/22/applications",
    "/teams/44/assign-coach",
  ]) {
    assert.equal(affectsCompetitionReads({ method: "post", url }), true, url);
  }
  assert.equal(
    affectsCompetitionReads({ method: "post", url: "/matches/8/events" }),
    false,
  );
  assert.equal(
    competitionMutationTournamentId({ method: "post", url: "/tournaments/3/team-registrations" }),
    3,
  );
  assert.equal(
    competitionMutationTournamentId({ method: "post", url: "/competition-entries", data: { tournament_id: 7 } }),
    7,
  );
});
