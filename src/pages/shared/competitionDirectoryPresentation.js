export const participantTypeLabel = (shape) => ({
  TEAM: "Team",
  SOLO: "Singles",
  DUO: "Doubles",
}[String(shape || "").toUpperCase()] || "Entry");

const sameOptionalId = (contextValue, participantValue) => {
  const contextId = Number(contextValue || 0);
  if (contextId <= 0) return true;
  return contextId === Number(participantValue || 0);
};

export const contextMatchesParticipant = (context = {}, participant = {}) => {
  const role = String(context?.role || "").toLowerCase();
  if (role === "player" && participant?.is_current_user_entry) return true;
  if (role === "department_manager") {
    return sameOptionalId(context?.department_id, participant?.department_id);
  }
  if (role === "sports_facilitator") {
    return sameOptionalId(context?.sport_id, participant?.sport_id)
      && sameOptionalId(
        context?.tournament_sport_event_id,
        participant?.tournament_sport_event_id
      );
  }
  if (context?.team_id && Number(context.team_id) !== Number(participant?.team_id || 0)) {
    return false;
  }
  if (!sameOptionalId(context?.department_id, participant?.department_id)) return false;
  if (!sameOptionalId(context?.sport_id, participant?.sport_id)) return false;
  if (!sameOptionalId(
    context?.tournament_sport_event_id,
    participant?.tournament_sport_event_id
  )) return false;
  const shape = String(context?.participant_shape || "").toUpperCase();
  return !shape || shape === String(participant?.participant_shape || "").toUpperCase();
};

export const getDirectoryPriority = ({
  participants = [],
  effectiveMode = "viewer",
  roleContexts = [],
} = {}) => {
  const mode = String(effectiveMode || "viewer").toLowerCase();
  const config = {
    coach: { title: "My Teams & Entries", empty: "No team or entry is assigned to you in this Intramural." },
    assistant_coach: { title: "My Teams & Entries", empty: "No team or entry is assigned to you in this Intramural." },
    player: { title: "My Team / My Entry", empty: "You are not assigned to a team or entry in this Intramural." },
    department_manager: { title: "My Department", empty: "No teams or entries are registered for your department in this Intramural." },
    sports_facilitator: { title: "Assigned Sport", empty: "No approved entries are available for your assigned sport." },
  }[mode] || null;
  if (!config) return { title: "", empty: "", participants: [], browse: participants };

  const relevantContexts = roleContexts.filter((context) => {
    const role = String(context?.role || "").toLowerCase();
    if (mode === "assistant_coach") return role === "assistant_coach";
    return role === mode;
  });
  const priority = participants.filter((participant) =>
    (mode === "player" && participant?.is_current_user_entry)
    || relevantContexts.some((context) => contextMatchesParticipant(context, participant))
  );
  const priorityIds = new Set(priority.map((participant) => Number(participant.entry_id)));
  return {
    ...config,
    participants: priority,
    browse: participants.filter((participant) => !priorityIds.has(Number(participant.entry_id))),
  };
};

export const groupParticipantsBySportEvent = (participants = []) => {
  const groups = new Map();
  participants.forEach((participant) => {
    const sportName = String(participant?.sport_name || "Sport");
    const eventName = String(participant?.event_name || participantTypeLabel(participant?.participant_shape));
    const key = `${Number(participant?.sport_id || 0)}:${Number(participant?.tournament_sport_event_id || 0)}:${eventName}`;
    if (!groups.has(key)) {
      groups.set(key, { key, sportName, eventName, participants: [] });
    }
    const group = groups.get(key);
    if (!group.participants.some((row) => Number(row.entry_id) === Number(participant.entry_id))) {
      group.participants.push(participant);
    }
  });
  return Array.from(groups.values()).sort((left, right) =>
    `${left.sportName} ${left.eventName}`.localeCompare(`${right.sportName} ${right.eventName}`)
  );
};

export const filterSportGroupsToCoachContexts = ({
  sportGroups = [],
  roleContexts = [],
  priorityEntryIds = new Set(),
} = {}) => {
  const contexts = roleContexts.filter((context) =>
    ["coach", "assistant_coach"].includes(String(context?.role || "").toLowerCase())
  );
  return sportGroups.map((sport) => ({
    ...sport,
    events: (sport.events || []).map((event) => ({
      ...event,
      departments: (event.departments || []).map((department) => {
        const matchingContexts = contexts.filter((context) =>
          sameOptionalId(context?.sport_id, sport?.sport_id)
          && sameOptionalId(context?.tournament_sport_event_id, event?.event_id)
          && sameOptionalId(context?.department_id, department?.department_id)
        );
        if (!matchingContexts.length) return null;
        return {
          ...department,
          entries: (department.entries || []).filter((entry) =>
            priorityEntryIds.has(Number(entry?.entry_id))
            || matchingContexts.some((context) =>
              !context?.team_id || Number(context.team_id) === Number(entry?.team_id || 0)
            )
          ),
        };
      }).filter(Boolean),
    })).filter((event) => event.departments.length > 0),
  })).filter((sport) => sport.events.length > 0);
};
