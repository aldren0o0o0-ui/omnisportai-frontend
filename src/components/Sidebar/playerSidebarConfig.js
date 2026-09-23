import {
  LayoutDashboard,
  Megaphone,
  Calendar,
  Users,
  GitBranch,
  Trophy,
  ListOrdered,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { flattenSidebarGroups } from "./sidebarTypes";

export const playerSidebarGroups = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/viewer/dashboard" },
      { label: "Venues", icon: MapPin, path: "/viewer/venues" },
    ],
  },
  {
    key: "competition",
    label: "Competition",
    icon: Trophy,
    items: [
      { label: "My Schedule", icon: Calendar, path: "/viewer/schedules" },
      { label: "My Team & Entries", icon: Users, path: "/viewer/teams" },
      { label: "Teams & Entries", icon: Users, path: "/viewer/teams-and-players" },
      { label: "Intramurals", icon: Calendar, path: "/viewer/intramurals" },
      { label: "Brackets", icon: GitBranch, path: "/viewer/brackets" },
      { label: "Standings", icon: Trophy, path: "/viewer/standings" },
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
  {
    key: "recruitment",
    label: "Recruitment",
    icon: ClipboardList,
    items: [
      { label: "Recruitment", icon: ClipboardList, path: "/viewer/teams" },
    ],
  },
];

export const playerSidebar = flattenSidebarGroups(playerSidebarGroups);
