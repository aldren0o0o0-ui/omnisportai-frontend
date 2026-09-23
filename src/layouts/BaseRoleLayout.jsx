import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../components/layout/AppSidebar";
import AppTopHeader from "../components/layout/AppTopHeader";
const BaseRoleLayout = ({
  groups,
  roleLabelOverride,
  shellNotice,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((previous) => !previous), []);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="os-app min-h-screen">
      <AppSidebar
        groups={groups}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
        roleLabelOverride={roleLabelOverride}
      />
      <div className="os-main">
        <AppTopHeader onOpenMobileSidebar={openMobileSidebar} />
        <main className="os-content">
          {shellNotice}
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default BaseRoleLayout;
