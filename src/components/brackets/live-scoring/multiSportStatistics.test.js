import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildMultiSportStats,
  getSportSchema,
  SPORT_SCHEMAS,
} from "./sportStatsEngine.js";

const mockParticipants = [
  {
    id: 1,
    name: "Team Alpha",
    shortName: "ALP",
    members: [
      { id: 101, displayName: "Player One", number: 1 },
      { id: 102, displayName: "Player Two", number: 2 },
    ],
  },
  {
    id: 2,
    name: "Team Beta",
    shortName: "BET",
    members: [
      { id: 201, displayName: "Player Three", number: 3 },
      { id: 202, displayName: "Player Four", number: 4 },
    ],
  },
];

test("Sport schemas enforce distinct fields based on sport rules and data", () => {
  const badminton = getSportSchema("badminton");
  const takraw = getSportSchema("takraw");
  const volleyball = getSportSchema("volleyball");
  const tennis = getSportSchema("tennis");
  const tableTennis = getSportSchema("table_tennis");
  const basketball = getSportSchema("basketball");

  // Badminton fields
  const badmintonKeys = badminton.metrics.map((m) => m.key);
  assert.ok(badmintonKeys.includes("smashWins"), "Badminton must have smashWins");
  assert.ok(badmintonKeys.includes("serviceFaults"), "Badminton must have serviceFaults");
  assert.ok(!badmintonKeys.includes("rollSpikes"), "Badminton must not have rollSpikes");
  assert.ok(!badmintonKeys.includes("kills"), "Badminton must not have kills");

  // Sepak Takraw fields
  const takrawKeys = takraw.metrics.map((m) => m.key);
  assert.ok(takrawKeys.includes("rollSpikes"), "Takraw must have rollSpikes");
  assert.ok(!takrawKeys.includes("smashWins"), "Takraw must not have smashWins");
  assert.ok(!takrawKeys.includes("rebounds"), "Takraw must not have rebounds");

  // Volleyball fields
  const volleyballKeys = volleyball.metrics.map((m) => m.key);
  assert.ok(volleyballKeys.includes("kills"), "Volleyball must have kills");
  assert.ok(volleyballKeys.includes("blockPoints"), "Volleyball must have blockPoints");
  assert.ok(!volleyballKeys.includes("rollSpikes"), "Volleyball must not have rollSpikes");
  assert.ok(!volleyballKeys.includes("breakPoints"), "Volleyball must not have breakPoints");

  // Tennis fields
  const tennisKeys = tennis.metrics.map((m) => m.key);
  assert.ok(tennisKeys.includes("gamesWon"), "Tennis must have gamesWon");
  assert.ok(tennisKeys.includes("breakPoints"), "Tennis must have breakPoints");
  assert.ok(tennisKeys.includes("doubleFaults"), "Tennis must have doubleFaults");
  assert.ok(!tennisKeys.includes("kills"), "Tennis must not have kills");

  // Table Tennis fields
  const tableTennisKeys = tableTennis.metrics.map((m) => m.key);
  assert.ok(tableTennisKeys.includes("netTouchFaults"), "Table Tennis must have netTouchFaults");
  assert.ok(tableTennisKeys.includes("rallyWins"), "Table Tennis must have rallyWins");
  assert.ok(!tableTennisKeys.includes("gamesWon"), "Table Tennis must not have gamesWon");
  assert.ok(!tableTennisKeys.includes("rollSpikes"), "Table Tennis must not have rollSpikes");

  // Basketball fields
  const basketballKeys = basketball.metrics.map((m) => m.key);
  assert.ok(basketballKeys.includes("rebounds"), "Basketball must have rebounds");
  assert.ok(basketballKeys.includes("assists"), "Basketball must have assists");
});

test("Badminton statistics calculates smashes, aces, rallies, and faults", () => {
  const events = [
    { team_id: 1, player_id: 101, event_type: "SMASH_WIN" },
    { team_id: 1, player_id: 101, event_type: "SERVICE_ACE" },
    { team_id: 1, player_id: 102, event_type: "RALLY_WIN" },
    { team_id: 1, player_id: 102, event_type: "SERVE_FAULT" },
    { team_id: 2, player_id: 201, event_type: "SMASH_WIN" },
    { team_id: 2, player_id: 202, event_type: "FOOT_FAULT" },
    { team_id: 1, event_type: "INTERVAL" },
  ];

  const { stats } = buildMultiSportStats("badminton", events, ["1", "2"], mockParticipants);

  assert.equal(stats["1"].pts, 3);
  assert.equal(stats["1"].smashWins, 1);
  assert.equal(stats["1"].serviceAces, 1);
  assert.equal(stats["1"].rallyWins, 1);
  assert.equal(stats["1"].serviceFaults, 1);
  assert.equal(stats["1"].intervals, 1);
  assert.equal(stats["1"].playerMetrics["101"].smashWins, 1);
  assert.equal(stats["1"].playerMetrics["101"].serviceAces, 1);

  assert.equal(stats["2"].pts, 1);
  assert.equal(stats["2"].smashWins, 1);
  assert.equal(stats["2"].footFaults, 1);
  assert.equal(stats["2"].playerMetrics["202"].footFaults, 1);
});

test("Sepak Takraw statistics calculates roll spikes, aces, rallies, and faults", () => {
  const events = [
    { team_id: 1, player_id: 101, event_type: "ROLL_SPIKE" },
    { team_id: 1, player_id: 101, event_type: "ROLL_SPIKE" },
    { team_id: 1, player_id: 102, event_type: "SERVICE_ACE" },
    { team_id: 2, player_id: 201, event_type: "FOOT_FAULT" },
    { team_id: 2, player_id: 202, event_type: "NET_FAULT" },
  ];

  const { stats } = buildMultiSportStats("takraw", events, ["1", "2"], mockParticipants);

  assert.equal(stats["1"].pts, 3);
  assert.equal(stats["1"].rollSpikes, 2);
  assert.equal(stats["1"].serviceAces, 1);
  assert.equal(stats["1"].playerMetrics["101"].rollSpikes, 2);
  assert.equal(stats["1"].playerMetrics["102"].serviceAces, 1);

  assert.equal(stats["2"].footFaults, 1);
  assert.equal(stats["2"].netFaults, 1);
  assert.equal(stats["2"].playerMetrics["201"].footFaults, 1);
  assert.equal(stats["2"].playerMetrics["202"].netFaults, 1);
});

test("Volleyball statistics calculates kills, block points, service aces, and faults", () => {
  const events = [
    { team_id: 1, player_id: 101, event_type: "KILL" },
    { team_id: 1, player_id: 102, event_type: "BLOCK_POINT" },
    { team_id: 1, player_id: 101, event_type: "SERVICE_ACE" },
    { team_id: 2, player_id: 201, event_type: "KILL" },
    { team_id: 2, player_id: 202, event_type: "NET_FAULT" },
    { team_id: 1, event_type: "TIMEOUT" },
  ];

  const { stats } = buildMultiSportStats("volleyball", events, ["1", "2"], mockParticipants);

  assert.equal(stats["1"].pts, 3);
  assert.equal(stats["1"].kills, 1);
  assert.equal(stats["1"].blockPoints, 1);
  assert.equal(stats["1"].serviceAces, 1);
  assert.equal(stats["1"].timeouts, 1);
  assert.equal(stats["1"].playerMetrics["101"].kills, 1);
  assert.equal(stats["1"].playerMetrics["102"].blockPoints, 1);

  assert.equal(stats["2"].pts, 1);
  assert.equal(stats["2"].kills, 1);
  assert.equal(stats["2"].netFaults, 1);
});

test("Tennis statistics calculates games won, aces, break points, and double faults", () => {
  const events = [
    { team_id: 1, player_id: 101, event_type: "GAME_WIN" },
    { team_id: 1, player_id: 101, event_type: "ACE" },
    { team_id: 1, player_id: 102, event_type: "BREAK_POINT_CONVERTED" },
    { team_id: 2, player_id: 201, event_type: "DOUBLE_FAULT" },
    { team_id: 2, player_id: 202, event_type: "FAULT" },
  ];

  const { stats } = buildMultiSportStats("tennis", events, ["1", "2"], mockParticipants);

  assert.equal(stats["1"].gamesWon, 1);
  assert.equal(stats["1"].serviceAces, 1);
  assert.equal(stats["1"].breakPoints, 1);
  assert.equal(stats["1"].playerMetrics["101"].gamesWon, 1);
  assert.equal(stats["1"].playerMetrics["101"].serviceAces, 1);

  assert.equal(stats["2"].doubleFaults, 1);
  assert.equal(stats["2"].faults, 1);
  assert.equal(stats["2"].playerMetrics["201"].doubleFaults, 1);
});

test("Table Tennis statistics calculates rallies won, service aces, and net touch faults", () => {
  const events = [
    { team_id: 1, player_id: 101, event_type: "RALLY_WIN" },
    { team_id: 1, player_id: 102, event_type: "SERVICE_ACE" },
    { team_id: 2, player_id: 201, event_type: "NET_TOUCH_FAULT" },
    { team_id: 2, player_id: 202, event_type: "FAULT" },
    { team_id: 1, event_type: "TIMEOUT" },
  ];

  const { stats } = buildMultiSportStats("table_tennis", events, ["1", "2"], mockParticipants);

  assert.equal(stats["1"].pts, 2);
  assert.equal(stats["1"].rallyWins, 1);
  assert.equal(stats["1"].serviceAces, 1);
  assert.equal(stats["1"].timeouts, 1);

  assert.equal(stats["2"].netTouchFaults, 1);
  assert.equal(stats["2"].faults, 1);
  assert.equal(stats["2"].playerMetrics["201"].netTouchFaults, 1);
});

test("ScoreboardDisplay mounts SportMatchAnalytics and passes sport data", () => {
  const scoreboard = fs.readFileSync(new URL("../components/ScoreboardDisplay.jsx", import.meta.url), "utf8");
  assert.match(scoreboard, /SportMatchAnalytics/);
  assert.match(scoreboard, /sportKey=\{sportKey\}/);
  assert.match(scoreboard, /timeline=\{timeline\}/);
  assert.match(scoreboard, /playerStats=\{playerStats\}/);
});

test("LiveScoringDashboard passes sportKey and statistics to ScoreboardDisplay", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  assert.match(dashboard, /sportKey=\{sportKey\}/);
  assert.match(dashboard, /timeline=\{timelineWithEffects\}/);
  assert.match(dashboard, /playerStats=\{liveState\?\.player_stats\}/);
});

test("buildMultiSportStats processes public viewer actions with labels and participant sides", () => {
  const viewerParticipants = [
    {
      id: 10,
      side: 1,
      display_name: "Tigers",
      roster: [{ id: 101, display_name: "Lee Z." }],
    },
    {
      id: 20,
      side: 2,
      display_name: "Hawks",
      roster: [{ id: 201, display_name: "Viktor A." }],
    },
  ];

  const viewerActions = [
    { label: "Smash Winner", participant_side: 1, player: { id: 101, display_name: "Lee Z." } },
    { label: "Service Ace", participant_side: 1, player: { id: 101, display_name: "Lee Z." } },
    { label: "Service fault", participant_side: 2, player: { id: 201, display_name: "Viktor A." } },
  ];

  const { stats } = buildMultiSportStats("badminton", viewerActions, ["10", "20"], viewerParticipants);
  assert.equal(stats["10"].smashWins, 1);
  assert.equal(stats["10"].serviceAces, 1);
  assert.equal(stats["10"].playerMetrics["101"].smashWins, 1);
  assert.equal(stats["20"].serviceFaults, 1);
  assert.equal(stats["20"].playerMetrics["201"].serviceFaults, 1);
});

