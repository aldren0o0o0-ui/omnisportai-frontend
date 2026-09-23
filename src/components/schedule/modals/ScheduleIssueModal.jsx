import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle } from "lucide-react";
import ScheduleIssueDrawer from "../../../pages/coordinator/schedules/ScheduleIssueDrawer";
export default function ScheduleIssueModal({
  actionLoading,
  blockingIssueCount,
  drawerSections,
  handleApplyRecommendationOption,
  handleFocusIssueMatch,
  handlePreflightQuickAction,
  issueDrawerFooterActions,
  issueDrawerOpen,
  realUnscheduledIssueCount,
  schedulePanelRef,
  setIssueDrawerOpen,
  warningIssueCount
}) {
  return (
    <AppModal open={issueDrawerOpen} onClose={() => setIssueDrawerOpen(false)} title="Schedule Issue Drawer" subtitle="How to fix schedule conflicts and readiness issues" variant="drawer" bodyClassName="p-0" closeButtonLabel="Close issue details" fallbackFocusRef={schedulePanelRef} describedById="schedule-issue-drawer-summary">
        <ScheduleIssueDrawer helperId="schedule-issue-drawer-summary" counts={{
        blocking: blockingIssueCount,
        warnings: warningIssueCount,
        unscheduled: realUnscheduledIssueCount
      }} sections={drawerSections} actionLoading={actionLoading} footerActions={issueDrawerFooterActions} onApplyRecommendation={option => {
        if (!option?.raw || !option?.matchId) return;
        void handleApplyRecommendationOption({
          matchId: option.matchId,
          option: option.raw
        });
      }} onNavigateAction={handlePreflightQuickAction} onFocusMatch={matchId => {
        setIssueDrawerOpen(false);
        handleFocusIssueMatch(matchId);
      }} />
      </AppModal>
  );
}
