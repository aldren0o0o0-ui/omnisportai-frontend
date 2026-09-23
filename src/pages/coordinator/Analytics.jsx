import { BarChart3 } from "lucide-react";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";

const Analytics = () => {
  return (
    <div className="space-y-6">
      <PageHeaderCard
        icon={BarChart3}
        title="Analytics"
        subtitle="Tournament analytics, sport performance metrics, and historical reporting."
      />
      <DashboardCard>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 size={40} className="mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Analytics coming soon</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Tournament statistics, player performance charts, and department comparisons will appear here.
          </p>
        </div>
      </DashboardCard>
    </div>
  );
};

export default Analytics;
