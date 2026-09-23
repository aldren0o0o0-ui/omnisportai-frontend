import { departmentSidebarGroups } from "../components/Sidebar/departmentSidebarConfig";
import BaseRoleLayout from "./BaseRoleLayout";

const DepartmentManagerLayout = () => (
  <BaseRoleLayout groups={departmentSidebarGroups} />
);

export default DepartmentManagerLayout;
