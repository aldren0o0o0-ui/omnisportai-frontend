import {
  BarChart3,
  Calendar,
  CalendarRange,
  ClipboardList,
  Users,
  GitBranch,
  LayoutDashboard,
  Trophy,
  Megaphone,
  MapPin,
} from "lucide-react";
import { flattenSidebarGroups } from "./sidebarTypes";

export const coachSidebarGroups = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/coach/dashboard" },
      { label: "Sports", icon: Trophy, path: "/coach/sports" },
      { label: "Venues", icon: MapPin, path: "/coach/venues" },
    ],
  },
  {
    key: "competition",
    label: "Competition",
    icon: Trophy,
    items: [
      { label: "Intramurals", icon: CalendarRange, path: "/coach/intramurals" },
      { label: "Brackets", icon: GitBranch, path: "/coach/brackets" },
      { label: "Schedules", icon: Calendar, path: "/coach/schedules" },
      { label: "Standings", icon: BarChart3, path: "/coach/standings" },
      { label: "My Entry", icon: Users, path: "/coach/teams-and-players" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: Megaphone,
    items: [
      { label: "Announcements", icon: Megaphone, path: "/coach/announcements" },
    ],
  },
  {
    key: "recruitment",
    label: "Recruitment",
    icon: ClipboardList,
    items: [
      { label: "Recruitment", icon: ClipboardList, path: "/coach/player-applications" },
    ],
  },
];

export const coachSidebar = flattenSidebarGroups(coachSidebarGroups);
