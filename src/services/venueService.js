import api from "../api/axios";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";

export const getVenues = async (includeInactive = true) => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.venues(includeInactive),
    staleTime: cacheTimes.reference,
    queryFn: async () => {
      const res = await api.get("/venues", {
        params: { include_inactive: includeInactive }
      });
      return res.data;
    },
  });
};

export const getVenueById = async (venueId) => {
  const res = await api.get(`/venues/${venueId}`);
  return res.data;
};

export const createVenue = async (payload) => {
  const res = await api.post("/venues", payload);
  return res.data;
};

export const updateVenue = async (venueId, payload) => {
  const res = await api.put(`/venues/${venueId}`, payload);
  return res.data;
};

export const updateVenueActive = async (venueId, isActive) => {
  const res = await api.patch(`/venues/${venueId}/active`, {
    is_active: isActive
  });
  return res.data;
};

export const deleteVenue = async (venueId) => {
  const res = await api.delete(`/venues/${venueId}`);
  return res.data;
};

export const getVenueAvailability = async (venueId) => {
  const res = await api.get(`/venues/${venueId}/availability`);
  return res.data;
};

export const getTournamentVenueAvailability = async (
  tournamentId,
  { venueIds = [], startDate = "", endDate = "" } = {},
) => {
  const normalizedVenueIds = [...new Set(
    (Array.isArray(venueIds) ? venueIds : []).map(Number).filter(Number.isFinite),
  )].sort((left, right) => left - right);
  return queryClient.fetchQuery({
    queryKey: queryKeys.scheduleAvailability(
      tournamentId,
      startDate,
      endDate,
      normalizedVenueIds,
    ),
    staleTime: 10_000,
    queryFn: async () => {
      const res = await api.get(`/tournaments/${tournamentId}/schedule/venue-availability`, {
        params: {
          venue_ids: normalizedVenueIds,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      return res.data;
    },
  });
};

export const createVenueAvailabilitySlot = async (venueId, payload) => {
  const res = await api.post(`/venues/${venueId}/availability`, payload);
  return res.data;
};

export const deleteVenueAvailabilitySlot = async (venueId, slotId) => {
  const res = await api.delete(`/venues/${venueId}/availability/${slotId}`);
  return res.data;
};
