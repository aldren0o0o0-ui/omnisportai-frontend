import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import DashboardCard from "../../components/common/DashboardCard";

const StaffManagement = () => {
  return (
    <div className="max-w-2xl">
      <DashboardCard>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Coach Assignment Workflow</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Official coaches are assigned through tournament-scoped coach assignments.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Department staff should no longer be promoted with a global coach role from this page. Use the
            tournament coach assignment workspace to assign coaches within the correct department, sport, and
            event scope.
          </p>

          <Link
            to="/department/coach-assignments"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Open Coach Assignments
            <ArrowRight size={16} />
          </Link>
        </div>
      </DashboardCard>
    </div>
  );
};

export default StaffManagement;
