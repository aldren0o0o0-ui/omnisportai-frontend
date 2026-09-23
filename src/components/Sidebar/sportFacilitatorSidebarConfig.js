import {
  BarChart3,
  LayoutDashboard,
  Trophy,
  Users,
  CalendarDays,
  CalendarRange,
  Megaphone,
  History,
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
      { label: "Staff & Officials", icon: Users, path: "/sport-facilitator/assigned-staff" },
      { label: "Teams & Entries", icon: Users, path: "/sport-facilitator/teams-and-players" },
      { label: "Intramurals", icon: CalendarRange, path: "/sport-facilitator/intramurals" },
      { label: "Schedules", icon: CalendarDays, path: "/sport-facilitator/schedules" },
      { label: "Brackets", icon: Trophy, path: "/sport-facilitator/brackets" },
      { label: "Standings", icon: BarChart3, path: "/sport-facilitator/standings" },
      { label: "Result Corrections", icon: History, path: "/sport-facilitator/result-corrections" },
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
