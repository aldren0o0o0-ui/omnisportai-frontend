import {
  LayoutDashboard,
  Megaphone,
  Trophy,
  Users,
  Calendar,
  BarChart3,
  ListOrdered,
  GitBranch,
  Star,
  MapPin,
} from "lucide-react";
import { flattenSidebarGroups } from "./sidebarTypes";

export const viewerSidebarGroups = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/viewer/dashboard" },
      { label: "Sports", icon: Trophy, path: "/viewer/sports" },
      { label: "Venues", icon: MapPin, path: "/viewer/venues" },
    ],
  },
  {
    key: "competition",
    label: "Competition",
    icon: Trophy,
    items: [
      { label: "Teams & Entries", icon: Users, path: "/viewer/teams-and-players" },
      { label: "Join a Team", icon: Users, path: "/viewer/teams" },
      { label: "Intramurals", icon: Calendar, path: "/viewer/intramurals" },
      { label: "Schedules", icon: Calendar, path: "/viewer/schedules" },
      { label: "Brackets", icon: GitBranch, path: "/viewer/brackets" },
      { label: "Standings", icon: BarChart3, path: "/viewer/standings" },
      { label: "Results", icon: ListOrdered, path: "/viewer/results" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: Megaphone,
    items: [
      { label: "Announcements", icon: Megaphone, path: "/viewer/announcements" },
    ],
  },
];

export const viewerSidebar = flattenSidebarGroups(viewerSidebarGroups);
