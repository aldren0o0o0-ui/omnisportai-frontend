/**
 * Shared layout constants and geometry formulas for the OmniSport AI Bracket System.
 * Ensures that RoundColumn, BracketTree, MatchCard, and ModernBracketView share
 * one authoritative definition of dimensions, gaps, and slot heights.
 */

export const bracketDensitySettings = {
  dense: {
    cardWidth: 210,
    cardHeight: 68,
    labelHeight: 14,
    labelGap: 2,
    slotHeight: 84, // 68 + 14 + 2
    baseGap: 24,
    connectorLength: 24,
    columnGap: 48, // connectorLength * 2
    sectionGap: 12
  },
  compact: {
    cardWidth: 232,
    cardHeight: 78,
    labelHeight: 16,
    labelGap: 4,
    slotHeight: 98, // 78 + 16 + 4
    baseGap: 30,
    connectorLength: 28,
    columnGap: 56, // connectorLength * 2
    sectionGap: 14
  },
  regular: {
    cardWidth: 260,
    cardHeight: 88,
    labelHeight: 18,
    labelGap: 4,
    slotHeight: 110, // 88 + 18 + 4
    baseGap: 36,
    connectorLength: 36,
    columnGap: 72, // connectorLength * 2
    sectionGap: 16
  }
};

export const resolveDensity = (firstRoundMatchCount) => {
  if (firstRoundMatchCount >= 24) return "dense";
  if (firstRoundMatchCount >= 12) return "compact";
  return "regular";
};
