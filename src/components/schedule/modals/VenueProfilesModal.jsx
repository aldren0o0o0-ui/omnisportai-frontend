import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { MapPin } from "lucide-react";
import VenueProfilesPanel from "../../../pages/coordinator/schedules/VenueProfilesPanel";
export default function VenueProfilesModal({
  availabilityByVenueId,
  navigate,
  schedulePanelRef,
  setVenueDrawerOpen,
  venueDrawerOpen,
  venuePreview,
  venueUsageCountByVenueId
}) {
  return (
    <AppModal open={venueDrawerOpen} onClose={() => setVenueDrawerOpen(false)} title="Venue Profiles" subtitle="Availability windows, supported sports, and current bookings" variant="drawer" bodyClassName="p-0" closeButtonLabel="Close venue profiles" fallbackFocusRef={schedulePanelRef}>
        <div className="p-4">
          <VenueProfilesPanel venues={venuePreview} availabilityByVenueId={availabilityByVenueId} usageCountByVenueId={venueUsageCountByVenueId} onManageVenues={() => navigate("/coordinator/venues")} compact />
        </div>
      </AppModal>
  );
}
