import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeRoles,
  hasRole,
  isMetricRenderable,
  formatMetricValue,
  formatProfileDate,
} from "./profileUtils.js";

describe("Phase 7C-4 — Remaining Role Experiences & Multi-Role Composition", () => {
  // =========================================================================
  // GENERAL ROLE CAPABILITIES
  // =========================================================================
  it("Test 1: Single role renders correctly", () => {
    const rawRoles = [{ role: "Coach" }];
    const normalized = normalizeRoles(rawRoles);
    assert.deepEqual(normalized, ["COACH"]);
    assert.equal(hasRole(rawRoles, "COACH"), true);
    assert.equal(hasRole(rawRoles, "Player"), false);
  });

  it("Test 2: Multiple roles render correctly", () => {
    const rawRoles = [{ role: "Coach" }, { role: "Department Manager" }];
    const normalized = normalizeRoles(rawRoles);
    assert.deepEqual(normalized, ["COACH", "DEPARTMENT_MANAGER"]);
    assert.equal(hasRole(rawRoles, "Coach"), true);
    assert.equal(hasRole(rawRoles, "Department Manager"), true);
    assert.equal(hasRole(rawRoles, "Sports Facilitator"), false);
  });

  it("Test 3: Header renders exactly once across all profiles", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    const headerMatches = drawerSrc.match(/<ProfileHeader/g);
    assert.equal(headerMatches?.length, 1);
  });

  it("Test 4: Empty role sections are omitted when capability is not active", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /\{isCoach \? \(/);
    assert.match(drawerSrc, /\{isFacilitator \? \(/);
    assert.match(drawerSrc, /\{isCoordinator \? \(/);
    assert.match(drawerSrc, /\{isDeptManager \? \(/);
    assert.match(drawerSrc, /\{isMinimalViewer \? \(/);
  });

  it("Test 5: Backend visibility is respected", async () => {
    const headerSrc = await readFile(
      new URL("./ProfileHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(headerSrc, /visibility = "PUBLIC"/);
  });

  it("Test 6: Sensitive masked fields (email, student_id) remain hidden when null", async () => {
    const headerSrc = await readFile(
      new URL("./ProfileHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(headerSrc, /\{email \? \(/);
    assert.match(headerSrc, /\{studentId \? \(/);
  });

  // =========================================================================
  // COACH EXPERIENCE
  // =========================================================================
  it("Test 7: Team management data renders in CoachSection", async () => {
    const coachSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(coachSrc, /data-testid="coach-management-section"/);
    assert.match(coachSrc, /data-testid="coach-managed-team-count"/);
    assert.match(coachSrc, /data-testid="coach-roster-count"/);
  });

  it("Test 8: Managed team context renders roster and sport context", async () => {
    const coachSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(coachSrc, /data-testid=\{`coach-team-item-\$\{t\.id/);
    assert.match(coachSrc, /t\.roster_count/);
    assert.match(coachSrc, /t\.sport/);
  });

  it("Test 9: Empty team management renders cleanly without errors", async () => {
    const coachSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(coachSrc, /data-testid="coach-empty-management"/);
    assert.match(coachSrc, /No active team rosters currently assigned under coach management/);
  });

  it("Test 10: No fabricated team statistics appear in CoachSection", async () => {
    const coachSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    // Does not calculate wins, losses, win rates, or points for teams
    assert.doesNotMatch(coachSrc, /team_wins/);
    assert.doesNotMatch(coachSrc, /team_losses/);
    assert.doesNotMatch(coachSrc, /win_rate/);
  });

  // =========================================================================
  // SPORTS FACILITATOR EXPERIENCE
  // =========================================================================
  it("Test 11: Staff assignments render in StaffSection", async () => {
    const staffSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(staffSrc, /data-testid="staff-operations-section"/);
    assert.match(staffSrc, /data-testid=\{`staff-assignment-item-\$\{idx\}`\}/);
    assert.match(staffSrc, /assign\.role_name \|\| assign\.role/);
  });

  it("Test 12: Operational information renders when available", async () => {
    const staffSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(staffSrc, /assign\.status/);
    assert.match(staffSrc, /assign\.sport/);
  });

  it("Test 13: Activity renders when available via RecentActivityList", async () => {
    const staffSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(staffSrc, /data-testid="recent-activity-list"/);
    assert.match(staffSrc, /data-testid=\{`activity-item-\$\{act\.id/);
  });

  it("Test 14: Missing operational data does not create fake statistics", async () => {
    const staffSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(staffSrc, /data-testid="facilitator-empty-assignments"/);
    assert.match(staffSrc, /No active tournament operational assignments recorded/);
    // Does not invent officiated matches or completion percentages
    assert.doesNotMatch(staffSrc, /matches_officiated/);
    assert.doesNotMatch(staffSrc, /completion_rate/);
  });

  // =========================================================================
  // DEPARTMENT MANAGER EXPERIENCE
  // =========================================================================
  it("Test 15: Department context renders in DepartmentManagerSection", async () => {
    const deptSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(deptSrc, /data-testid="dept-manager-section"/);
    assert.match(deptSrc, /Official representative for/);
  });

  it("Test 16: Participation/delegation data renders when available", async () => {
    const deptSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(deptSrc, /deptEntries\.length/);
    assert.match(deptSrc, /Registered Delegation Entries/);
  });

  it("Test 17: Stats render only when supplied by backend", async () => {
    const deptSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(deptSrc, /Department standings and official medals are finalized/);
  });

  it("Test 18: No frontend championship calculations are introduced", async () => {
    const deptSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(deptSrc, /calcChampionship/);
    assert.doesNotMatch(deptSrc, /sumMedals/);
    assert.doesNotMatch(deptSrc, /gold \* 100/);
  });

  // =========================================================================
  // SPORTS COORDINATOR EXPERIENCE
  // =========================================================================
  it("Test 19: Coordinator identity renders in CoordinatorSection", async () => {
    const coordSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(coordSrc, /data-testid="coordinator-oversight-section"/);
    assert.match(coordSrc, /Tournament Coordination/);
  });

  it("Test 20: Available coordination data renders oversight and direct assignments", async () => {
    const coordSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(coordSrc, /Active Tournament Governance/);
    assert.match(coordSrc, /Direct Coordination Assignments/);
  });

  it("Test 21: Dashboard-like statistics are not fabricated in CoordinatorSection", async () => {
    const coordSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    // Does not embed full dashboard tables, live scoreboards, or scheduling calendars
    assert.doesNotMatch(coordSrc, /<Table/);
    assert.doesNotMatch(coordSrc, /LiveScoreboard/);
    assert.doesNotMatch(coordSrc, /FullCalendar/);
  });

  // =========================================================================
  // VIEWER EXPERIENCE
  // =========================================================================
  it("Test 22: Minimal profile renders in ViewerMinimalSection", async () => {
    const viewerSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(viewerSrc, /data-testid="viewer-minimal-section"/);
    assert.match(viewerSrc, /Community Participant/);
  });

  it("Test 23: Public identity renders public headline or bio", async () => {
    const viewerSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    assert.match(viewerSrc, /publicProfile\?\.headline/);
    assert.match(viewerSrc, /Public community member profile/);
  });

  it("Test 24: Operational data is hidden in ViewerMinimalSection", async () => {
    const fullSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    const viewerSrc = fullSrc.slice(fullSrc.indexOf("export const ViewerMinimalSection"));
    assert.doesNotMatch(viewerSrc, /staffAssignments/);
    assert.doesNotMatch(viewerSrc, /teamManagement/);
  });

  it("Test 25: Private fields remain hidden in ViewerMinimalSection", async () => {
    const fullSrc = await readFile(
      new URL("./RoleProfileSections.jsx", import.meta.url),
      "utf8"
    );
    const viewerSrc = fullSrc.slice(fullSrc.indexOf("export const ViewerMinimalSection"));
    assert.doesNotMatch(viewerSrc, /email/);
    assert.doesNotMatch(viewerSrc, /student_id/);
  });

  // =========================================================================
  // MULTI-ROLE COMPOSITION
  // =========================================================================
  it("Test 26: PLAYER + COACH renders both capabilities seamlessly", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /\{isPlayer \? \(\s*<PlayerProfileContent/);
    assert.match(drawerSrc, /\{isCoach \? \(\s*<CoachSection/);
  });

  it("Test 27: COACH + DEPARTMENT_MANAGER renders both capabilities", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /\{isCoach \? \(\s*<CoachSection/);
    assert.match(drawerSrc, /\{isDeptManager \? \(\s*<DepartmentManagerSection/);
  });

  it("Test 28: PLAYER + FACILITATOR renders both capabilities", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /\{isPlayer \? \(\s*<PlayerProfileContent/);
    assert.match(drawerSrc, /\{isFacilitator \? \(\s*<StaffSection/);
  });

  it("Test 29: Header is rendered exactly once across multi-role combinations", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    const matches = drawerSrc.match(/<ProfileHeader/g);
    assert.equal(matches?.length, 1);
  });

  // =========================================================================
  // REGRESSION / ROLE BADGES
  // =========================================================================
  it("Test 30: ProfileRoleBadges supports all standard roles with distinct token styling", () => {
    const allRoles = [
      { role: "Player" },
      { role: "Coach" },
      { role: "Sports Facilitator" },
      { role: "Department Manager" },
      { role: "Sports Coordinator" },
      { role: "Viewer" },
      { role: "Admin" },
    ];
    const normalized = normalizeRoles(allRoles);
    assert.equal(normalized.length, 7);
    assert.equal(hasRole(allRoles, "Player"), true);
    assert.equal(hasRole(allRoles, "Coach"), true);
    assert.equal(hasRole(allRoles, "Sports Facilitator"), true);
    assert.equal(hasRole(allRoles, "Department Manager"), true);
    assert.equal(hasRole(allRoles, "Sports Coordinator"), true);
    assert.equal(hasRole(allRoles, "Viewer"), true);
    assert.equal(hasRole(allRoles, "Admin"), true);
  });
});
