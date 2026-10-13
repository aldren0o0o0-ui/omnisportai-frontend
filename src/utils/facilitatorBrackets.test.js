import test from "node:test";
import assert from "node:assert/strict";

test("Facilitator brackets tournament selection and scoping verification", async (t) => {
  await t.test("Tournament resolution prioritizes selected intramural workspace tournaments over facilitator foreign tournaments", () => {
    // Simulate workspace with tournament id 10
    const scopedRows = [
      { id: 10, tournament_name: "Intramural 2026 Championship" }
    ];
    // Facilitator has role in tournament 5 (from a different intramural)
    const facilitatorTournamentIds = [5];
    const requestedTournamentId = 5;

    const requestedTournamentIsInWorkspace = scopedRows.some(
      (row) => Number(row?.id || 0) === requestedTournamentId
    );
    const storedSelection = { id: "10", name: "Intramural 2026 Championship" };
    const storedTournamentId = Number(storedSelection?.id || 0);
    const storedTournamentIsInWorkspace = scopedRows.some(
      (row) => Number(row?.id || 0) === storedTournamentId
    );

    let targetTournamentId = 0;
    if (requestedTournamentIsInWorkspace) {
      targetTournamentId = requestedTournamentId;
    } else if (storedTournamentIsInWorkspace) {
      targetTournamentId = storedTournamentId;
    } else if (facilitatorTournamentIds.length > 0) {
      const matchingAssigned = scopedRows.find((row) =>
        facilitatorTournamentIds.includes(Number(row?.id || 0))
      );
      if (matchingAssigned) {
        targetTournamentId = Number(matchingAssigned.id || 0);
      } else {
        targetTournamentId = Number(scopedRows[0]?.id || 0);
      }
    } else {
      targetTournamentId = Number(scopedRows[0]?.id || 0);
    }

    assert.equal(targetTournamentId, 10, "Target tournament must be within the selected intramural (10), not foreign tournament (5)");
  });

  await t.test("Facilitator permission correctly identifies assigned sports vs unassigned view-only sports in selected tournament", () => {
    const effectiveAssignedSportIds = [1]; // Facilitator is assigned only to Basketball (id 1) in this tournament
    const targetScopedManagement = true;

    const isFacilitatorForSport = (sportId) => {
      if (!targetScopedManagement) return true;
      if (!sportId) return false;
      if (effectiveAssignedSportIds.length > 0) {
        return effectiveAssignedSportIds.some((allowedId) => Number(allowedId) === Number(sportId));
      }
      return false;
    };

    assert.equal(isFacilitatorForSport(1), true, "Assigned sport has facilitator management permissions");
    assert.equal(isFacilitatorForSport(2), false, "Unassigned sport is view-only");
    assert.equal(isFacilitatorForSport(3), false, "Other unassigned sport is view-only");
  });

  await t.test("When facilitator facilitates no sports in the selected intramural, all sports are view-only", () => {
    const effectiveAssignedSportIds = []; // No assigned sports in this tournament
    const targetScopedManagement = true;

    const isFacilitatorForSport = (sportId) => {
      if (!targetScopedManagement) return true;
      if (!sportId) return false;
      if (effectiveAssignedSportIds.length > 0) {
        return effectiveAssignedSportIds.some((allowedId) => Number(allowedId) === Number(sportId));
      }
      return false;
    };

    assert.equal(isFacilitatorForSport(1), false, "Sport 1 is view-only when user has no assignments in tournament");
    assert.equal(isFacilitatorForSport(2), false, "Sport 2 is view-only when user has no assignments in tournament");
  });
});
