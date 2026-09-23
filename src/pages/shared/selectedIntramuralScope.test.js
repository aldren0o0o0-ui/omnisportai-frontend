import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const simulateScopedRequests = () => {
  let version = 0;
  let scope = "";
  let visible = null;
  return {
    select(nextScope) {
      scope = nextScope;
      visible = null;
      version += 1;
      return { scope, version };
    },
    resolve(token, payload) {
      if (token.scope === scope && token.version === version) visible = payload;
    },
    visible: () => visible,
  };
};

test("A to B to A request tokens never allow a slow stale response to replace the selected scope", () => {
  const state = simulateScopedRequests();
  const firstA = state.select("A");
  state.resolve(firstA, "A:first");
  assert.equal(state.visible(), "A:first");

  const b = state.select("B");
  assert.equal(state.visible(), null);
  const secondA = state.select("A");
  assert.equal(state.visible(), null);
  state.resolve(b, "B:late");
  state.resolve(firstA, "A:stale");
  assert.equal(state.visible(), null);
  state.resolve(secondA, "A:current");
  assert.equal(state.visible(), "A:current");
});

test("Brackets clears old data and binds exact-tournament reads to a request sequence", () => {
  const source = read("../coordinator/Brackets.jsx");
  assert.match(source, /setBrackets\(\[\]\)/);
  assert.match(source, /getBrackets\(resolvedTournamentId\)/);
  assert.match(source, /requestSequence !== bracketRequestSequenceRef\.current/);
});

test("Standings clears old scope and rejects stale responses", () => {
  const source = read("./StandingsPage.jsx");
  assert.match(source, /setTournamentId\(null\)/);
  assert.match(source, /setPayload\(null\)/);
  assert.match(source, /requestId !== requestSequence\.current/);
});

test("Teams and role permissions are keyed or neutralized before selected-scope resolution", () => {
  const directory = read("./CompetitionDirectoryPage.jsx");
  const drawer = read("../../components/dashboard/TeamDetailsDrawer.jsx");
  const access = read("../../hooks/useTournamentAccess.js");
  assert.match(directory, /"competition-directory",\s*workspaceId,\s*tournamentId/);
  assert.match(directory, /sportGroups={sportGroups}/);
  assert.doesNotMatch(directory, /role\s*===\s*["']coach["']/);
  assert.match(drawer, /getEntry\(entryId\)/);
  assert.match(drawer, /getTeamRoster\(teamId/);
  assert.match(access, /queryKeys\.tournamentAccess\(user\?\.id, selectedTournamentId\)/);
  assert.match(access, /accessQuery\.data \|\| createTournamentAccessFallback\(\)/);
  assert.doesNotMatch(access, /keepPreviousData|placeholderData/);
});

test("Teams and entries use the shared event-centered directory and one lazy detail drawer", () => {
  const directory = read("./CompetitionDirectoryPage.jsx");
  assert.match(directory, /EventCenteredCompetitionDirectory/);
  assert.match(directory, /TeamDetailsDrawer/);
  assert.doesNotMatch(directory, /ParticipantDrawer/);
});

test("The top bar keeps the global coordinator role when a stored tournament was deleted", () => {
  const header = read("../../components/layout/AppTopHeader.jsx");
  const access = read("../../hooks/useTournamentAccess.js");
  assert.match(header, /coordinator:\s*"Sports Coordinator"/);
  assert.match(header, /tournamentAccess\.error\s*\? fallbackRoleLabel/);
  assert.match(access, /accessQuery\.error\?\.response\?\.status === 404/);
  assert.match(access, /setSelectedTournamentSelection\(\)/);
});
