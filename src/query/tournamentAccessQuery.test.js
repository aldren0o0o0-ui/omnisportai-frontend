import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import { cacheTimes, queryKeys } from "./queryClient.js";

test("concurrent tournament-access consumers share one in-flight request", async () => {
  const client = new QueryClient();
  let calls = 0;
  const queryKey = queryKeys.tournamentAccess(42, 3);
  const queryFn = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { tournament_id: 3, effective_mode: "coach" };
  };
  const options = { queryKey, queryFn, staleTime: cacheTimes.tournamentAccess };

  const [first, second] = await Promise.all([
    client.fetchQuery(options),
    client.fetchQuery(options),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);

  await client.fetchQuery(options);
  assert.equal(calls, 1, "a warm access query should reuse fresh cached data");
});

test("tournament-access keys isolate tournament and authenticated user", () => {
  assert.notDeepEqual(
    queryKeys.tournamentAccess(42, 3),
    queryKeys.tournamentAccess(42, 4)
  );
  assert.notDeepEqual(
    queryKeys.tournamentAccess(42, 3),
    queryKeys.tournamentAccess(99, 3)
  );
});

test("useTournamentAccess is backed by the shared TanStack query", async () => {
  const source = await readFile(new URL("../hooks/useTournamentAccess.js", import.meta.url), "utf8");
  assert.match(source, /useQuery\s*\(/);
  assert.match(source, /queryKeys\.tournamentAccess\(user\?\.id, selectedTournamentId\)/);
  assert.match(source, /staleTime:\s*cacheTimes\.tournamentAccess/);
  assert.doesNotMatch(source, /refreshVersion|setTournamentAccess/);
});

test("authentication identity changes clear protected query data", async () => {
  const source = await readFile(new URL("./AuthQueryCacheBoundary.jsx", import.meta.url), "utf8");
  assert.match(source, /queryClient\.clear\(\)/);
  assert.match(source, /previousIdentityRef\.current !== identity/);
});
