import { SCORING_PROFILE_FAMILY, normalizeSportKey } from "../utils/sportUiProfile.js";

export const resolveLiveScoringSurface = ({ profileFamily, sportKey } = {}) => {
  const normalizedSportKey = normalizeSportKey(sportKey);
  if (
    profileFamily === SCORING_PROFILE_FAMILY.TIMED_TEAM
    && normalizedSportKey.includes("basketball")
  ) {
    return "BASKETBALL_TIMED_TEAM";
  }
  return "LEGACY";
};
