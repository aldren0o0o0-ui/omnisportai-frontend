import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("ViewerResults reuses ResultCorrectionsPage in resultsOnly mode to avoid duplicate code", () => {
  const viewerResults = read("../viewer/Results.jsx");
  assert.match(viewerResults, /import ResultCorrectionsPage from "\.\.\/shared\/ResultCorrectionsPage"/);
  assert.match(viewerResults, /<ResultCorrectionsPage resultsOnly \/>/);
  assert.doesNotMatch(viewerResults, /Results page coming soon/);
});

test("ResultCorrectionsPage supports resultsOnly mode and hides corrections requests tab", () => {
  const page = read("./ResultCorrectionsPage.jsx");
  assert.match(page, /resultsOnly = false/);
  assert.match(page, /isCorrectionsPermitted = isCoordinator && !resultsOnly/);
  assert.match(page, /isCorrectionsPermitted \? "Match Results & Corrections" : "Match Results"/);
  assert.match(page, /isCorrectionsPermitted \? \(/);
  assert.match(page, /!isCorrectionsPermitted \|\| currentTab === "results"/);
});

test("ResultCorrectionsPage resolves role navigation prefix for all viewer, coach, department, and coordinator roles", () => {
  const page = read("./ResultCorrectionsPage.jsx");
  assert.match(page, /location\.pathname\.startsWith\("\/department"\)/);
  assert.match(page, /location\.pathname\.startsWith\("\/coach"\)/);
  assert.match(page, /location\.pathname\.startsWith\("\/sport-facilitator"\)/);
  assert.match(page, /location\.pathname\.startsWith\("\/coordinator"\)/);
  assert.match(page, /navigate\(`\$\{rolePrefix\}\/matches\/\$\{match\.id\}`/);
});

test("App.jsx wires ViewerResults across viewer, department, and coach routes", () => {
  const app = read("../../App.jsx");
  assert.match(app, /import\('\.\/pages\/viewer\/Results'\)/);
  // Viewer route
  assert.match(app, /<Route path="results" element=\{renderLazyRoute\(ViewerResults\)\} \/>/);
  // Coach layout contains results
  const coachIndex = app.indexOf('<Route path="/coach" element={<CoachLayout />}>');
  const coachEndIndex = app.indexOf('</Route>', coachIndex + 100);
  const coachSection = app.slice(coachIndex, coachEndIndex);
  assert.match(coachSection, /<Route path="results" element=\{renderLazyRoute\(ViewerResults\)\} \/>/);
});

test("coachSidebarConfig exposes Results navigation link alongside Standings", () => {
  const sidebar = read("../../components/Sidebar/coachSidebarConfig.js");
  assert.match(sidebar, /ListOrdered/);
  assert.match(sidebar, /\{ label: "Results", icon: ListOrdered, path: "\/coach\/results" \}/);
});

test("sportFacilitatorSidebarConfig exposes Results navigation link and removes Result Corrections", () => {
  const sidebar = read("../../components/Sidebar/sportFacilitatorSidebarConfig.js");
  assert.match(sidebar, /ListOrdered/);
  assert.match(sidebar, /\{ label: "Results", icon: ListOrdered, path: "\/sport-facilitator\/results" \}/);
  assert.doesNotMatch(sidebar, /Result Corrections/);
});

test("App.jsx wires ViewerResults and redirects legacy result-corrections for sport-facilitator", () => {
  const app = read("../../App.jsx");
  assert.match(app, /<Route path="results" element=\{renderLazyRoute\(ViewerResults\)\} \/>/);
  assert.match(app, /<Route path="result-corrections" element=\{<Navigate to="\/sport-facilitator\/results" replace \/>\} \/>/);
});

test("sportFacilitatorSidebarConfig removes Staff & Officials feature", () => {
  const sidebar = read("../../components/Sidebar/sportFacilitatorSidebarConfig.js");
  assert.doesNotMatch(sidebar, /Staff & Officials/);
  assert.doesNotMatch(sidebar, /assigned-staff/);
});

test("Facilitator dashboard layouts remove assigned-staff references and links", () => {
  const layout = read("../../components/dashboard/role_dashboard/layouts/FacilitatorDashboardLayout.jsx");
  const ops = read("../../components/dashboard/role_dashboard/layouts/FacilitatorOperationsDashboard.jsx");
  assert.doesNotMatch(layout, /\/sport-facilitator\/assigned-staff/);
  assert.doesNotMatch(layout, /Officials on Duty/);
  assert.doesNotMatch(ops, /\/sport-facilitator\/assigned-staff/);
  assert.doesNotMatch(ops, /StaffOfficialsCard/);
});
