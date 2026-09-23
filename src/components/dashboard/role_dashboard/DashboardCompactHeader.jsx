import { Link } from "react-router-dom";
import PageHeaderCard from "../../common/PageHeaderCard";

const DashboardCompactHeader = ({ title, subtitle, actions = [] }) => {
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];

  const ActionButtons = safeActions.length > 0 ? (
    <div className="flex flex-wrap items-center gap-2">
      {safeActions.map((action) => {
        const label = action?.label || "Action";
        const variantClass = action?.variant === "primary"
          ? "os-btn-primary inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          : "os-btn-ghost rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700";

        if (action?.to) {
          return (
            <Link key={`link-${label}-${action.to}`} to={action.to} className={variantClass}>
              {label}
            </Link>
          );
        }

        return (
          <button key={`button-${label}`} type="button" className={variantClass} onClick={action?.onClick}>
            {label}
          </button>
        );
      })}
    </div>
  ) : null;

  return <PageHeaderCard title={title} subtitle={subtitle} action={ActionButtons} />;
};

export default DashboardCompactHeader;
