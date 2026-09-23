export const DASHBOARD_TOURNAMENT_NAME_KEY = "omnisport:dashboard_tournament_name";
export const DASHBOARD_TOURNAMENT_ID_KEY = "omnisport:dashboard_tournament_id";
export const DASHBOARD_TOURNAMENT_SELECTION_EVENT = "omnisport:tournament-selection-updated";

const canUseWindow = () => typeof window !== "undefined";

export const readStoredDashboardTournamentSelection = () => {
  if (!canUseWindow()) {
    return { id: "", name: "" };
  }

  try {
    return {
      id: String(window.sessionStorage.getItem(DASHBOARD_TOURNAMENT_ID_KEY) || "").trim(),
      name: String(window.sessionStorage.getItem(DASHBOARD_TOURNAMENT_NAME_KEY) || "").trim(),
    };
  } catch {
    return { id: "", name: "" };
  }
};

export const writeStoredDashboardTournamentSelection = ({ id = "", name = "" } = {}) => {
  if (!canUseWindow()) return;

  try {
    window.sessionStorage.setItem(DASHBOARD_TOURNAMENT_ID_KEY, String(id || "").trim());
    window.sessionStorage.setItem(DASHBOARD_TOURNAMENT_NAME_KEY, String(name || "").trim());
  } catch {
    // no-op
  }
};

export const broadcastDashboardTournamentSelection = ({
  id = "",
  name = "",
  source = "dashboard",
} = {}) => {
  if (!canUseWindow()) return;

  window.dispatchEvent(
    new CustomEvent(DASHBOARD_TOURNAMENT_SELECTION_EVENT, {
      detail: {
        id: String(id || "").trim(),
        name: String(name || "").trim(),
        source: String(source || "dashboard").trim(),
      },
    })
  );
};
