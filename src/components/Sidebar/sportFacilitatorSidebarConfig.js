import {
  BarChart3,
  LayoutDashboard,
  Trophy,
  Users,
  CalendarDays,
  CalendarRange,
  Megaphone,
  ListOrdered,
  MapPin,
} from "lucide-react";
import { flattenSidebarGroups } from "./sidebarTypes";

export const sportFacilitatorSidebarGroups = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/sport-facilitator/dashboard" },
      { label: "Sports", icon: Trophy, path: "/sport-facilitator/sports" },
      { label: "Venues", icon: MapPin, path: "/sport-facilitator/venues" },
    ],
  },
  {
    key: "competition",
    label: "Competition",
    icon: Trophy,
    items: [
      { label: "Teams & Entries", icon: Users, path: "/sport-facilitator/teams-and-players" },
      { label: "Intramurals", icon: CalendarRange, path: "/sport-facilitator/intramurals" },
      { label: "Schedules", icon: CalendarDays, path: "/sport-facilitator/schedules" },
      { label: "Brackets", icon: Trophy, path: "/sport-facilitator/brackets" },
      { label: "Standings", icon: BarChart3, path: "/sport-facilitator/standings" },
      { label: "Results", icon: ListOrdered, path: "/sport-facilitator/results" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: Megaphone,
    items: [
      { label: "Announcements", icon: Megaphone, path: "/sport-facilitator/announcements" },
    ],
  },
];

export const sportFacilitatorSidebar = flattenSidebarGroups(sportFacilitatorSidebarGroups);
