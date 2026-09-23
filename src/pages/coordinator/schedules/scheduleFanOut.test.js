import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { queryKeys } from "../../../query/queryClient.js";

const schedulesSource = readFileSync(
  new URL("../Schedules.jsx", import.meta.url),
  "utf8",
);
const venueServiceSource = readFileSync(
  new URL("../../../services/venueService.js", import.meta.url),
  "utf8",
);

test("schedule availability query key is stable across venue ordering", () => {
  assert.deepEqual(
    queryKeys.scheduleAvailability(3, "2026-09-01", "2026-09-15", [5, 2, 5]),
    queryKeys.scheduleAvailability(3, "2026-09-01", "2026-09-15", [2, 5]),
  );
});

test("schedule page defers one aggregate availability request until interaction", () => {
  assert.match(schedulesSource, /if \(!venueDrawerOpen \|\| !selectedTournamentId/);
  assert.match(schedulesSource, /getTournamentVenueAvailability\(Number\(selectedTournamentId\)/);
  assert.doesNotMatch(schedulesSource, /previewVenues\.map\(venue => getVenueAvailability/);
  assert.match(venueServiceSource, /schedule\/venue-availability/);
});

test("primary schedule rendering does not await analytics", () => {
  assert.match(schedulesSource, /const analyticsPromise = getScheduleAnalytics/);
  assert.match(schedulesSource, /const eventsResponse = await getScheduleEvents/);
  assert.doesNotMatch(
    schedulesSource,
    /await Promise\.all\(\[getScheduleEvents[^\]]+getScheduleAnalytics/,
  );
});

test("initial tournament selection reuses program blocks from schedule events", () => {
  assert.match(schedulesSource, /setProgramBlocks\(Array\.isArray\(eventsResponse\?\.program_blocks\)/);
  assert.doesNotMatch(
    schedulesSource,
    /setPreflightRunning\(false\);\s*loadProgramBlocks\(selectedTournamentId\)/,
  );
});
