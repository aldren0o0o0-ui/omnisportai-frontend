import {
  LayoutDashboard,
  Megaphone,
  Trophy,
  Users,
  UserCog,
  ClipboardList,
  Calendar,
  GitBranch,
  BarChart,
  MapPin,
} from "lucide-react";
import { flattenSidebarGroups } from "./sidebarTypes";

export const departmentSidebarGroups = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/department/dashboard" },
      { label: "Sports", icon: Trophy, path: "/department/sports" },
      { label: "Venues", icon: MapPin, path: "/department/venues" },
    ],
  },
  {
    key: "competition",
    label: "Competition",
    icon: Trophy,
    items: [
      { label: "My Department", icon: Users, path: "/department/teams" },
      { label: "Coach Assignments", icon: ClipboardList, path: "/department/coach-assignments" },
      { label: "Intramurals", icon: Calendar, path: "/department/intramurals" },
      { label: "Schedules", icon: Calendar, path: "/department/schedules" },
      { label: "Results", icon: BarChart, path: "/department/results" },
      { label: "Brackets", icon: GitBranch, path: "/department/brackets" },
      { label: "Standings", icon: BarChart, path: "/department/standings" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: Megaphone,
    items: [
      { label: "Announcements", icon: Megaphone, path: "/department/announcements" },
    ],
  },
];

export const departmentSidebar = flattenSidebarGroups(departmentSidebarGroups);
