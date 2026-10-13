/**
 * Utility to identify sports hidden from the frontend UI.
 * Hidden sports: Football (Soccer), Handball, Baseball, Beach Volleyball, and Archery.
 */

export const HIDDEN_SPORT_TOKENS = [
  "football",
  "soccer",
  "handball",
  "hand ball",
  "baseball",
  "beach volleyball",
  "beach_volleyball",
  "archery",
];

const HIDDEN_KEY_SET = new Set([
  "football",
  "football_11v11",
  "soccer",
  "handball",
  "hand_ball",
  "handball_7v7",
  "baseball",
  "baseball_9v9",
  "beach_volleyball",
  "beach_volleyball_2v2",
  "archery",
  "archery_recurve_individual",
]);

/**
 * Checks whether a given sport, template, competition, or sport reference object
 * corresponds to one of the hidden sports (football, handball, baseball, beach volleyball, archery).
 *
 * @param {object|string|null|undefined} sportOrKey
 * @returns {boolean} True if the sport should be hidden from the UI.
 */
export const isHiddenSport = (sportOrKey) => {
  if (!sportOrKey) return false;

  if (typeof sportOrKey === "string") {
    const raw = sportOrKey.trim().toLowerCase();
    if (HIDDEN_KEY_SET.has(raw)) return true;
    const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (HIDDEN_KEY_SET.has(slug)) return true;
    return matchesHiddenToken(raw, slug);
  }

  // Check identifier fields (template_id, sport_id, sport_code, code, etc.)
  const keyCandidates = [
    sportOrKey.template_id,
    sportOrKey.sport_id,
    sportOrKey.sport_code,
    sportOrKey.code,
    sportOrKey.sport_key,
    sportOrKey.key,
  ];

  for (const candidate of keyCandidates) {
    if (candidate && typeof candidate === "string") {
      const raw = candidate.trim().toLowerCase();
      if (HIDDEN_KEY_SET.has(raw)) return true;
      const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (HIDDEN_KEY_SET.has(slug)) return true;
    }
  }

  // Check display label / name fields
  const nameCandidates = [
    sportOrKey.name,
    sportOrKey.sport_name,
    sportOrKey.label,
    sportOrKey.title,
    sportOrKey.canonical_display_name,
  ];

  for (const candidate of nameCandidates) {
    if (candidate && typeof candidate === "string") {
      const raw = candidate.trim().toLowerCase();
      const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (matchesHiddenToken(raw, slug)) return true;
    }
  }

  return false;
};

function matchesHiddenToken(raw, slug) {
  // Football / Soccer
  if (raw === "football" || raw.startsWith("football ") || raw.endsWith(" football") || raw.includes(" football ")) return true;
  if (raw === "soccer" || raw.startsWith("soccer ") || raw.endsWith(" soccer") || raw.includes(" soccer ")) return true;
  if (slug === "football" || slug.startsWith("football_") || slug.endsWith("_football") || slug.includes("_football_")) return true;
  if (slug === "soccer" || slug.startsWith("soccer_") || slug.endsWith("_soccer") || slug.includes("_soccer_")) return true;

  // Handball
  if (raw === "handball" || raw.startsWith("handball ") || raw.endsWith(" handball") || raw.includes(" handball ")) return true;
  if (raw === "hand ball" || raw.startsWith("hand ball ") || raw.endsWith(" hand ball") || raw.includes(" hand ball ")) return true;
  if (slug === "handball" || slug.startsWith("handball_") || slug.endsWith("_handball") || slug.includes("_handball_")) return true;
  if (slug === "hand_ball" || slug.startsWith("hand_ball_") || slug.endsWith("_hand_ball") || slug.includes("_hand_ball_")) return true;

  // Baseball
  if (raw === "baseball" || raw.startsWith("baseball ") || raw.endsWith(" baseball") || raw.includes(" baseball ")) return true;
  if (slug === "baseball" || slug.startsWith("baseball_") || slug.endsWith("_baseball") || slug.includes("_baseball_")) return true;

  // Beach Volleyball (explicitly distinct from indoor volleyball!)
  if (raw.includes("beach volleyball") || raw.includes("beach-volleyball")) return true;
  if (slug.includes("beach_volleyball")) return true;

  // Archery
  if (raw === "archery" || raw.startsWith("archery ") || raw.endsWith(" archery") || raw.includes(" archery ")) return true;
  if (slug === "archery" || slug.startsWith("archery_") || slug.endsWith("_archery") || slug.includes("_archery_")) return true;

  return false;
}

/**
 * Filter an array to only include sports/templates that are visible in the UI.
 *
 * @param {Array} list
 * @returns {Array} Filtered list without hidden sports.
 */
export const filterVisibleSports = (list) => {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => !isHiddenSport(item));
};
