import {
  LayoutDashboard,
  Megaphone,
  Trophy,
  Users,
  Calendar,
  GitBranch,
  BarChart,
  UserCog,
  MapPin,
  Star,
  History,
  ClipboardCheck,
} from "lucide-react";
import { flattenSidebarGroups } from "./sidebarTypes";

export const coordinatorSidebarGroups = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/coordinator/dashboard" },
      { label: "Sports", icon: Trophy, path: "/coordinator/sports" },
      { label: "Venues", icon: MapPin, path: "/coordinator/venues" },
    ],
  },
  {
    key: "competition",
    label: "Competition",
    icon: Trophy,
    items: [
      { label: "Teams & Entries", icon: Users, path: "/coordinator/teams-and-players" },
      { label: "Intramurals", icon: Calendar, path: "/coordinator/intramurals" },
      // { label: "Rehearsal Setup", icon: ClipboardCheck, path: "/coordinator/rehearsal-setup" },
      { label: "Schedules", icon: Calendar, path: "/coordinator/schedules" },
      { label: "Brackets", icon: GitBranch, path: "/coordinator/brackets" },
      { label: "Standings", icon: BarChart, path: "/coordinator/standings" },
      { label: "Result Corrections", icon: History, path: "/coordinator/result-corrections" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: Megaphone,
    items: [
      { label: "Announcements", icon: Megaphone, path: "/coordinator/announcements" },
    ],
  },
  {
    key: "management",
    label: "Management",
    icon: UserCog,
    items: [
      { label: "Users", icon: UserCog, path: "/coordinator/management/users" },
      { label: "Departments", icon: Users, path: "/coordinator/management/departments" },
    ],
  },
];

export const coordinatorSidebar = flattenSidebarGroups(coordinatorSidebarGroups);
