import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNormalizedEventCategory,
  getSportDisplayName,
  getEventDisplayName,
  getCompetitionDisplayLabel,
  resolveSportEventCapabilities,
  serializeSportBracketSettingsForPayload,
} from "./tournamentEventCategories.js";

const sport = { id: 1, sport_name: "Configured Sport" };

test("capabilities come from backend template metadata", () => {
  const templates = [{
    template_id: "configured_sport",
    allowed_participant_shapes: ["SOLO", "DUO"],
    allowed_divisions: ["MEN", "WOMEN"],
  }];
  assert.deepEqual(resolveSportEventCapabilities(sport, templates), {
    allowedParticipantShapes: ["SOLO", "DUO"],
    allowedDivisions: ["MEN", "WOMEN"],
  });
});

test("single-shape capabilities do not invent extra choices", () => {
  const templates = [{
    template_id: "configured_sport",
    allowed_participant_shapes: ["TEAM"],
    allowed_divisions: ["OPEN"],
  }];
  assert.deepEqual(resolveSportEventCapabilities(sport, templates).allowedParticipantShapes, ["TEAM"]);
});

test("structured division survives normalization and payload serialization", () => {
  const event = buildNormalizedEventCategory({
    event_name: "Fast Doubles",
    event_key: "fast_doubles",
    division_category: "WOMEN",
    participant_shape: "DUO",
    max_entries_per_department: 2,
    minimum_total_entries_for_bracket: 2,
  });
  const [setting] = serializeSportBracketSettingsForPayload({
    sportIds: [1],
    sports: [sport],
    sportSettings: [{ sport_id: 1, events: [event] }],
  });
  assert.equal(setting.events[0].division_category, "WOMEN");
  assert.equal(setting.events[0].participant_shape, "DUO");
  assert.equal(setting.events[0].players_per_entry, 2);
});

test("unchecked backend suggestions are visible in state but omitted from persistence", () => {
  const templates = [{
    template_id: "configured_sport",
    min_players: 1,
    max_players: 2,
    default_event_categories: [
      { event_name: "Singles", event_key: "singles", participant_shape: "SOLO", division_category: "OPEN" },
      { event_name: "Doubles", event_key: "doubles", participant_shape: "DUO", division_category: "OPEN", is_default_enabled: false },
    ],
  }];
  const [setting] = serializeSportBracketSettingsForPayload({
    sportIds: [1],
    sports: [sport],
    templates,
    sportSettings: [],
  });
  assert.deepEqual(setting.events.map((event) => event.event_key), ["singles"]);
});

test("TEAM roster bounds are serialized while SOLO and DUO remain exact", () => {
  const [setting] = serializeSportBracketSettingsForPayload({
    sportIds: [1],
    sports: [sport],
    sportSettings: [{ sport_id: 1, events: [
      { event_name: "Team Event", participant_shape: "TEAM", division_category: "OPEN", min_players: 5, max_players: 12 },
      { event_name: "Pair Event", participant_shape: "DUO", division_category: "OPEN", min_players: 9, max_players: 20 },
    ] }],
  });
  assert.deepEqual([setting.events[0].min_players, setting.events[0].max_players], [5, 12]);
  assert.deepEqual([setting.events[1].min_players, setting.events[1].max_players], [2, 2]);
});

test("backend competition name and playing format survive wizard normalization", () => {
  const event = buildNormalizedEventCategory({
    event_name: "Basketball",
    event_key: "5v5_team",
    division_category: "OPEN",
    participant_shape: "TEAM",
    playing_format: "5v5",
    min_players: 5,
    max_players: 12,
  });
  assert.equal(event.event_name, "Basketball");
  assert.equal(event.event_key, "5v5_team");
  assert.equal(event.playing_format, "5v5");
});

test("canonical sport label is structured and never derived by string surgery", () => {
  const legacySport = { id: 8, sport_name: "Table Tennis Doubles", canonical_display_name: "Table Tennis" };
  assert.equal(getSportDisplayName(legacySport), "Table Tennis");
  assert.equal(getSportDisplayName({ sport_name: "Unmapped Doubles" }), "Unmapped Doubles");
});

test("global event and combined labels keep sport and event semantics separate", () => {
  const context = { sport_name: "Table Tennis Doubles", canonical_display_name: "Table Tennis", event_name: "Women's Doubles" };
  assert.equal(getEventDisplayName(context), "Women's Doubles");
  assert.equal(getCompetitionDisplayLabel({ sport: context, event: context }), "Table Tennis · Women's Doubles");
});
