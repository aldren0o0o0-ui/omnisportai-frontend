import test from "node:test";
import assert from "node:assert/strict";

import {
  SPORT_STATISTICS_PROFILES,
  classifyEventAttribution,
  getConfiguredStatisticsSportKeys,
  getSportStatisticsProfile,
  resolveActionAttributionPolicy,
} from "./sportStatisticsConfig.js";

const EXPECTED_SPORTS = [
  "basketball", "volleyball", "badminton", "beach_volleyball_2v2", "takraw",
  "tennis_doubles", "table_tennis_doubles", "football_11v11", "handball_7v7",
  "baseball_9v9", "boxing", "chess", "archery_recurve_individual",
  "athletics_100m_sprint", "swimming_100m_freestyle",
];

test("all 15 configured sports have internally consistent statistics profiles", () => {
  assert.deepEqual(getConfiguredStatisticsSportKeys().sort(), [...EXPECTED_SPORTS].sort());
  for (const [sport, profile] of Object.entries(SPORT_STATISTICS_PROFILES)) {
    assert.ok(profile.primaryMetrics.length > 0, `${sport} needs a primary metric`);
    assert.equal(new Set([...profile.primaryMetrics, ...profile.secondaryMetrics]).size, Object.keys(profile.metrics).length);
    assert.ok(profile.metrics[profile.sortKey] || profile.sortKey === null, `${sport} sort key must exist`);
    const aliasOwners = new Map();
    for (const [key, metric] of Object.entries(profile.metrics)) {
      assert.equal(metric.key, key);
      assert.ok(metric.sourceKeys.length > 0);
      assert.equal(typeof metric.runtimeAvailability.unified, "boolean");
      assert.equal(typeof metric.runtimeAvailability.specialized, "boolean");
      for (const source of metric.sourceKeys) {
        const alias = String(source).toUpperCase();
        const owner = aliasOwners.get(alias);
        assert.ok(!owner || owner === key, `${sport} alias ${alias} is shared by ${owner} and ${key}`);
        aliasOwners.set(alias, key);
      }
    }
  }
});

test("sport aliases reuse canonical profiles", () => {
  assert.equal(getSportStatisticsProfile("BASKETBALL"), SPORT_STATISTICS_PROFILES.basketball);
  assert.equal(getSportStatisticsProfile("Beach Volleyball"), SPORT_STATISTICS_PROFILES.beach_volleyball_2v2);
  assert.equal(getSportStatisticsProfile("Sepak-Takraw"), SPORT_STATISTICS_PROFILES.takraw);
});

test("attribution policy follows existing action metadata", () => {
  assert.equal(resolveActionAttributionPolicy({ control: { requires_player: true } }), "REQUIRED_EXISTING_ONLY");
  assert.equal(resolveActionAttributionPolicy({ control: { event_type: "TIMEOUT", requires_team: true } }), "NONE");
  assert.equal(resolveActionAttributionPolicy({ control: { event_type: "RALLY_WIN", requires_team: true } }), "OPTIONAL");
  assert.equal(classifyEventAttribution({ event: { player_id: 8 }, policy: "OPTIONAL" }), "attributed");
  assert.equal(classifyEventAttribution({ event: {}, policy: "OPTIONAL" }), "unattributed");
  assert.equal(classifyEventAttribution({ event: {}, policy: "NONE" }), "not_required");
});
