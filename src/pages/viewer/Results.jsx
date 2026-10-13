import React from "react";
import ResultCorrectionsPage from "../shared/ResultCorrectionsPage";

/**
 * Results Page for Viewer, Player, Department Manager, and Coach.
 * Reuses ResultCorrectionsPage in resultsOnly mode to avoid code duplication
 * while presenting real-time finished match results, scores, and winners.
 */
const ViewerResults = () => {
  return <ResultCorrectionsPage resultsOnly />;
};

export default ViewerResults;
