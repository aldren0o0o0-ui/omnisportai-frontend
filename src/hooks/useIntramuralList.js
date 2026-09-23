import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkspaces } from "../services/workspaceService";
import { WORKSPACE_LIST_CHANGED_EVENT } from "../services/workspaceEvents";
import { getTournaments } from "../services/tournamentService";
import { buildTournamentByWorkspace } from "../utils/workspaceTournamentResolver";

const useIntramuralList = () => {
  const [intramurals, setIntramurals] = useState([]);
  const [tournamentByWorkspace, setTournamentByWorkspace] = useState({});
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async ({ keepCurrent = false } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!keepCurrent) setLoading(true);
    try {
      const [wsData, tournamentData] = await Promise.all([
        getWorkspaces({ includeArchived: true }).catch(() => []),
        getTournaments({ includeArchived: true }).catch(() => []),
      ]);
      const list = Array.isArray(wsData?.workspaces)
        ? wsData.workspaces
        : Array.isArray(wsData)
          ? wsData
          : [];
      const map = buildTournamentByWorkspace(tournamentData);
      if (requestId !== requestIdRef.current) return;
      setIntramurals(list);
      setTournamentByWorkspace(map);
    } catch {
      if (requestId !== requestIdRef.current) return;
      if (!keepCurrent) {
        setIntramurals([]);
        setTournamentByWorkspace({});
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const handleListChanged = (event) => {
      const changedWorkspace = event?.detail?.workspace;
      const changedTournament = event?.detail?.tournament;
      if (changedWorkspace?.id) {
        setIntramurals((current) => {
          const rows = Array.isArray(current) ? current : [];
          const exists = rows.some(
            (row) => Number(row?.id) === Number(changedWorkspace.id)
          );
          return exists
            ? rows.map((row) =>
                Number(row?.id) === Number(changedWorkspace.id)
                  ? { ...row, ...changedWorkspace }
                  : row
              )
            : [...rows, changedWorkspace];
        });
      }
      if (changedWorkspace?.id && changedTournament?.id) {
        setTournamentByWorkspace((current) => ({
          ...(current || {}),
          [Number(changedWorkspace.id)]: changedTournament,
        }));
      }
      void load({ keepCurrent: true });
    };
    window.addEventListener(WORKSPACE_LIST_CHANGED_EVENT, handleListChanged);
    return () =>
      window.removeEventListener(WORKSPACE_LIST_CHANGED_EVENT, handleListChanged);
  }, [load]);

  return { intramurals, tournamentByWorkspace, loading };
};

export default useIntramuralList;
