import test from "node:test";
import assert from "node:assert/strict";

import { buildSubstitutionSubmission } from "./substitutionPayload.js";

test("substitution identifies the outgoing and incoming players in canonical metadata", () => {
  const result = buildSubstitutionSubmission({
    control: { event_type: "SUBSTITUTION", provides_value: false },
    eventDefinition: { value_type: "float" },
    teamId: 10,
    outPlayerId: 101,
    inPlayerId: 106,
  });
  assert.equal(result.teamIdOverride, 10);
  assert.equal(result.playerIdOverride, 101);
  assert.equal(result.inputValueOverride, undefined);
  assert.deepEqual(result.metadataOverride, {
    player_out_id: 101,
    player_in_id: 106,
    out_player_id: 101,
    in_player_id: 106,
  });
});

test("value-requiring legacy substitution controls remain compatible", () => {
  const result = buildSubstitutionSubmission({
    control: { event_type: "SUBSTITUTION", provides_value: true },
    eventDefinition: { value_type: "json" },
    teamId: 20,
    outPlayerId: 201,
    inPlayerId: 207,
  });
  assert.deepEqual(JSON.parse(result.inputValueOverride), result.metadataOverride);
});
