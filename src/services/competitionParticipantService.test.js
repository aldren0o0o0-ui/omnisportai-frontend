import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { queryKeys } from "../query/queryClient.js";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("participant and structural queries have separate identities", () => {
  const key = queryKeys.competitionParticipants(3, { scope: "managed", pageSize: 500, includeMembers: true });
  assert.equal(key[0], "competition-participants");
  assert.equal(key[1], 3);
  assert.equal(key.at(-1), true);
});

test("dashboards use one managed projection instead of directory enumeration", () => {
  const service = read("./competitionParticipantService.js");
  const legacy = read("./competitionDirectoryService.js");
  const consumers = [
    read("../pages/coach/Dashboard.jsx"),
    read("../components/dashboard/role_dashboard/layouts/CoachDashboardLayout.jsx"),
    read("../components/dashboard/role_dashboard/layouts/DepartmentDashboardLayout.jsx"),
  ];
  assert.match(service, /competition-participants/);
  assert.match(service, /scope:\s*"managed"/);
  assert.doesNotMatch(legacy, /getAllCompetitionDirectoryParticipants/);
  for (const source of consumers) {
    assert.match(source, /getManagedCompetitionParticipants/);
    assert.doesNotMatch(source, /getAllCompetitionDirectoryParticipants/);
  }
});

test("Teams and Entries remains on the structural directory", () => {
  const page = read("../pages/shared/CompetitionDirectoryPage.jsx");
  assert.match(page, /getCompetitionDirectory/);
  assert.doesNotMatch(page, /getCompetitionParticipants/);
  assert.match(page, /sportGroups={sportGroups}/);
});
