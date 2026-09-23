import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSportEventLabel,
  getSelectedIntramuralRoleLabels,
  getTournamentAssignmentLabel,
  getTournamentRoleLabels,
} from "./tournamentAccess.js";

test("selected-intramural labels use the effective role, not a global historical role", () => {
  const labels = getSelectedIntramuralRoleLabels({
    effective_mode: "viewer",
    global_roles: ["coach", "viewer"],
    role_contexts: [],
  }, "Intramural 2028");

  assert.deepEqual(labels, {
    role: "Viewer",
    intramural: "Intramural 2028",
    assignment: "",
  });
});

test("top-bar roles include current and other eligible roles without duplicates", () => {
  assert.deepEqual(getTournamentRoleLabels({
    effective_mode: "coach",
    eligibility_roles: ["viewer", "coach", "department_manager"],
    role_contexts: [{ role: "coach" }],
  }), ["Coach", "Viewer", "Department Manager"]);
});

test("assignment label includes only contexts for the current intramural role", () => {
  const access = {
    effective_mode: "coach",
    role_contexts: [
      { role: "viewer", sport_label: "Basketball" },
      { role: "coach", sport_label: "Badminton Singles" },
      { role: "coach", sport_label: "Badminton Doubles" },
    ],
  };

  assert.equal(getTournamentAssignmentLabel(access), "Badminton Singles +1");
});

test("buildSportEventLabel deduplicates when sport name already includes event name", () => {
  assert.equal(
    buildSportEventLabel("Archery Recurve Individual", "Recurve Individual"),
    "Archery Recurve Individual"
  );
  assert.equal(
    buildSportEventLabel("Archery", "Archery Recurve Individual"),
    "Archery Recurve Individual"
  );
  assert.equal(
    buildSportEventLabel("Badminton", "Men's Singles"),
    "Badminton Men's Singles"
  );
});

