import { useState } from "react";
import DashboardCard from "../../../components/common/DashboardCard";
import StepProgress from "../../../components/common/StepProgress";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { RECRUITMENT_STAGES, computeRecruitmentStage } from "./recruitmentWorkflow";

/**
 * Workflow Progress (V2).
 *
 * Mobile: full horizontal stepper card at the top.
 * Desktop (lg+): an in-flow collapsible rail beside the table.
 *   - Collapsed (default): a narrow rail showing only the numbered nodes, with
 *     a chevron button to expand.
 *   - Expanded: a labeled panel with a "back" chevron that collapses it.
 *   Because the rail lives in the grid (not absolutely positioned), expanding
 *   widens its column and the table beside it reflows narrower automatically.
 *   The rail fills its cell height so it levels with the bottom of the table.
 *
 * States communicate progress, not permissions (Completed / Current / Waiting).
 */
const RecruitmentProgress = ({ workspace, className = "" }) => {
  const currentIndex = computeRecruitmentStage(workspace);
  const safe = Math.max(0, Math.min(Number(currentIndex) || 0, RECRUITMENT_STAGES.length - 1));
  const [expanded, setExpanded] = useState(false);

  const nodeClass = (index) =>
    index < safe
      ? "bg-[var(--success)] text-white border-[var(--success)]"
      : index === safe
        ? "bg-[var(--info)] text-white border-[var(--info)] ring-4 ring-[var(--info-soft)]"
        : "bg-[var(--surface-muted)] text-[var(--text-soft)] border-[var(--border-soft)]";

  return (
    <>
      {/* Mobile — full horizontal stepper */}
      <DashboardCard className={`lg:hidden ${className}`}>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          Workflow Progress
        </h2>
        <StepProgress steps={RECRUITMENT_STAGES} currentIndex={safe} />
      </DashboardCard>

      {/* Desktop — in-flow collapsible rail (width animates; table reflows) */}
      <div
        className={`hidden h-full transition-[width] duration-200 ease-out lg:block ${
          expanded ? "w-64" : "w-16"
        } ${className}`}
      >
        <div className="os-card flex h-full flex-col p-3">
          {expanded ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Workflow Progress
                </h2>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Hide workflow progress"
                  aria-expanded="true"
                  title="Hide"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-soft)] transition hover:bg-[var(--surface-soft)]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <StepProgress
                steps={RECRUITMENT_STAGES}
                currentIndex={safe}
                orientation="responsive"
                className="flex-1"
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label="Show workflow progress"
                aria-expanded="false"
                title="Show workflow progress"
                className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-soft)] transition hover:bg-[var(--surface-soft)]"
              >
                <ChevronLeft size={16} />
              </button>
              <ol className="flex w-full flex-1 flex-col items-center" aria-label="Recruitment progress">
                {RECRUITMENT_STAGES.map((step, index) => (
                  <li
                    key={step.key}
                    className="flex flex-col items-center first:flex-none [&:not(:first-child)]:flex-1"
                    aria-current={index === safe ? "step" : undefined}
                    title={step.label}
                  >
                    {index > 0 ? (
                      <span
                        className={`w-0.5 flex-1 rounded-full ${
                          index <= safe ? "bg-[var(--success)]" : "bg-[var(--border-soft)]"
                        }`}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={`my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${nodeClass(index)}`}
                    >
                      {index < safe ? <Check size={14} aria-hidden="true" /> : index + 1}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RecruitmentProgress;
