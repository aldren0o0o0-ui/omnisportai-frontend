import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildTeamStats } from "./basketballStatsEngine.js";

const mockParticipants = [
  {
    id: 10,
    name: "Lakers",
    shortName: "LAL",
    members: [
      { id: 101, displayName: "LeBron James", number: 23 },
      { id: 102, displayName: "Anthony Davis", number: 3 },
    ],
    benchMembers: [
      { id: 103, displayName: "Austin Reaves", number: 15 },
    ],
  },
  {
    id: 20,
    name: "Warriors",
    shortName: "GSW",
    members: [
      { id: 201, displayName: "Stephen Curry", number: 30 },
      { id: 202, displayName: "Draymond Green", number: 23 },
    ],
    benchMembers: [],
  },
];

test("buildTeamStats calculates points breakdown (1PT, 2PT, 3PT) accurately", () => {
  const events = [
    { team_id: 10, player_id: 101, event_type: "TWO_PT_MADE" },
    { team_id: 10, player_id: 101, event_type: "THREE_PT_MADE" },
    { team_id: 10, player_id: 102, event_type: "FREE_THROW" },
    { team_id: 20, player_id: 201, event_type: "THREE_PT_MADE" },
    { team_id: 20, player_id: 201, event_type: "THREE_PT_MADE" },
  ];

  const stats = buildTeamStats(events, ["10", "20"], mockParticipants);

  assert.equal(stats["10"].pts, 6);
  assert.equal(stats["10"].twoP, 1);
  assert.equal(stats["10"].threeP, 1);
  assert.equal(stats["10"].ft, 1);
  assert.equal(stats["10"].playerPts["101"], 5);
  assert.equal(stats["10"].playerPts["102"], 1);

  assert.equal(stats["20"].pts, 6);
  assert.equal(stats["20"].threeP, 2);
  assert.equal(stats["20"].twoP, 0);
  assert.equal(stats["20"].playerPts["201"], 6);
});

test("buildTeamStats records rebounds (offensive, defensive, generic) for team and players", () => {
  const events = [
    { team_id: 10, player_id: 102, event_type: "REBOUND" },
    { team_id: 10, player_id: 102, event_type: "OFFENSIVE_REBOUND" },
    { team_id: 20, player_id: 202, event_type: "DEFENSIVE_REBOUND" },
  ];

  const stats = buildTeamStats(events, ["10", "20"], mockParticipants);

  assert.equal(stats["10"].rebounds, 2);
  assert.equal(stats["10"].offRebounds, 1);
  assert.equal(stats["10"].playerRebounds["102"], 2);
  assert.equal(stats["10"].playerOffRebounds["102"], 1);

  assert.equal(stats["20"].rebounds, 1);
  assert.equal(stats["20"].defRebounds, 1);
  assert.equal(stats["20"].playerRebounds["202"], 1);
});

test("buildTeamStats records assists, steals, blocks, and turnovers", () => {
  const events = [
    { team_id: 10, player_id: 101, event_type: "ASSIST" },
    { team_id: 10, player_id: 101, event_type: "TURNOVER" },
    { team_id: 20, player_id: 201, event_type: "STEAL" },
    { team_id: 20, player_id: 202, event_type: "BLOCK" },
  ];

  const stats = buildTeamStats(events, ["10", "20"], mockParticipants);

  assert.equal(stats["10"].assists, 1);
  assert.equal(stats["10"].turnovers, 1);
  assert.equal(stats["10"].playerAssists["101"], 1);
  assert.equal(stats["10"].playerTurnovers["101"], 1);

  assert.equal(stats["20"].steals, 1);
  assert.equal(stats["20"].blocks, 1);
  assert.equal(stats["20"].playerSteals["201"], 1);
  assert.equal(stats["20"].playerBlocks["202"], 1);
});

test("buildTeamStats records fouls and timeouts", () => {
  const events = [
    { team_id: 10, player_id: 102, event_type: "FOUL" },
    { team_id: 10, player_id: 102, event_type: "TECHNICAL_FOUL" },
    { team_id: 10, event_type: "TIMEOUT" },
    { team_id: 20, event_type: "TIMEOUT" },
  ];

  const stats = buildTeamStats(events, ["10", "20"], mockParticipants);

  assert.equal(stats["10"].fouls, 2);
  assert.equal(stats["10"].timeouts, 1);
  assert.equal(stats["10"].playerFouls["102"], 2);

  assert.equal(stats["20"].timeouts, 1);
  assert.equal(stats["20"].fouls, 0);
});

test("buildTeamStats seamlessly merges backend player_stats if provided", () => {
  const events = [
    { team_id: 10, player_id: 101, event_type: "TWO_PT_MADE" },
  ];
  const backendPlayerStats = {
    "101": {
      POINTS: 14,
      ASSIST: 5,
      REBOUND: 7,
      STEAL: 2,
    },
    "201": {
      POINTS: 20,
      ASSIST: 6,
    },
  };

  const stats = buildTeamStats(events, ["10", "20"], mockParticipants, backendPlayerStats);

  // LeBron: 14 pts from backend, 5 ast, 7 reb, 2 stl
  assert.equal(stats["10"].playerPts["101"], 14);
  assert.equal(stats["10"].playerAssists["101"], 5);
  assert.equal(stats["10"].playerRebounds["101"], 7);
  assert.equal(stats["10"].playerSteals["101"], 2);

  // Curry: 20 pts from backend, 6 ast
  assert.equal(stats["20"].playerPts["201"], 20);
  assert.equal(stats["20"].playerAssists["201"], 6);
});

test("TimedTeamSurface declares BasketballAnalytics and live statistics elements", () => {
  const surface = fs.readFileSync(new URL("./TimedTeamSurface.jsx", import.meta.url), "utf8");
  assert.match(surface, /BasketballAnalytics/);
  assert.match(surface, /buildTeamStats/);
  assert.match(surface, /teamStats=\{matchStats/);
  assert.match(surface, /Fls:/);
  assert.match(surface, /TO:/);
  assert.match(surface, /Reb:/);
  assert.match(surface, /Ast:/);
  assert.match(surface, /aria-label="Basketball Match Analytics and Box Score"/);
});

test("LiveScoringDashboard passes timeline and playerStats to TimedTeamSurface", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  assert.match(dashboard, /timeline=\{timelineWithEffects\}/);
  assert.match(dashboard, /playerStats=\{liveState\?\.player_stats\}/);
});
