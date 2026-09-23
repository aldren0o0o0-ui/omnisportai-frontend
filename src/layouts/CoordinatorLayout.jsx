import { coordinatorSidebarGroups } from "../components/Sidebar/sidebarConfig";
import BaseRoleLayout from "./BaseRoleLayout";

const CoordinatorLayout = () => (
  <BaseRoleLayout groups={coordinatorSidebarGroups} />
);

export default CoordinatorLayout;
