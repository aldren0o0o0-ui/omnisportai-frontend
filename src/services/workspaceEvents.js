export const WORKSPACE_CHANGED_EVENT = "omnisport:workspace-changed";
export const WORKSPACE_LIST_CHANGED_EVENT = "omnisport:workspace-list-changed";

export const dispatchWorkspaceChanged = (workspace = null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_CHANGED_EVENT, { detail: { workspace } })
  );
};

export const dispatchWorkspaceListChanged = (workspace = null, tournament = null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_LIST_CHANGED_EVENT, {
      detail: { workspace, tournament },
    })
  );
};
