import AIInsights from "../dashboard/AIInsights";
import FairnessChart from "../dashboard/FairnessChart";

const RightPanel = ({
  insights = [],
  fairness = null,
  onInsightAction = null,
  supportsSchedulingModes = false,
  insightWarningState = {},
  insightContextKey = "",
  hasRealUnscheduledMatches = false,
  hideInsightActions = false,
}) => {
  return (
    <aside className="space-y-3 xl:sticky xl:top-20">
      <AIInsights
        insights={insights}
        onAction={onInsightAction}
        supportsSchedulingModes={supportsSchedulingModes}
        warningState={insightWarningState}
        insightContextKey={insightContextKey}
        hasRealUnscheduledMatches={hasRealUnscheduledMatches}
        hideActionButtons={hideInsightActions}
      />
      <FairnessChart fairness={fairness} />
    </aside>
  );
};

export default RightPanel;
