import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("TallyBoardShell defines and renders Declare Winner shortcut button when authorized", () => {
  const shell = fs.readFileSync(new URL("./TallyBoardShell.jsx", import.meta.url), "utf8");
  assert.match(shell, /canDeclareWinner/);
  assert.match(shell, /onDeclareWinner/);
  assert.match(shell, /Declare Winner/);
  assert.match(shell, /<Trophy/);
});

test("LiveScoringDashboard wires ShortcutWinnerModal and canDeclareWinner to tally surfaces", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  assert.match(dashboard, /import ShortcutWinnerModal from "\.\/components\/ShortcutWinnerModal"/);
  assert.match(dashboard, /const \[isShortcutWinnerOpen, setIsShortcutWinnerOpen\] = useState\(false\)/);
  assert.match(dashboard, /const canDeclareWinner = useMemo/);
  assert.match(dashboard, /<ShortcutWinnerModal/);

  // Check both TallyBoardShell occurrences have canDeclareWinner and onDeclareWinner
  const timedBranch = dashboard.indexOf("useTimedTeamSurface ? (");
  const boxingBranch = dashboard.indexOf("useBoxingScorecardSurface ? (");
  const legacyBranch = dashboard.indexOf(") : (", boxingBranch);

  assert.ok(timedBranch > 0);
  assert.ok(boxingBranch > timedBranch);
  assert.ok(legacyBranch > boxingBranch);

  const timedShell = dashboard.slice(timedBranch, boxingBranch);
  assert.match(timedShell, /canDeclareWinner=\{canDeclareWinner\}/);
  assert.match(timedShell, /onDeclareWinner=\{/);

  const boxingShell = dashboard.slice(boxingBranch, legacyBranch);
  assert.match(boxingShell, /canDeclareWinner=\{canDeclareWinner\}/);
  assert.match(boxingShell, /onDeclareWinner=\{/);

  const fallbackHeader = dashboard.slice(legacyBranch);
  assert.match(fallbackHeader, /canDeclareWinner && \(/);
  assert.match(fallbackHeader, /Declare Winner/);
});

test("ShortcutWinnerModal file exists and imports recordManualMatchResult", () => {
  const modal = fs.readFileSync(new URL("../components/ShortcutWinnerModal.jsx", import.meta.url), "utf8");
  assert.match(modal, /recordManualMatchResult/);
  assert.match(modal, /scoreTeam1/);
  assert.match(modal, /scoreTeam2/);
  assert.match(modal, /selectedWinnerId/);
  assert.match(modal, /IdentityImage/);
});
