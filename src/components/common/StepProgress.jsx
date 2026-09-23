import React from "react";
import { Check } from "lucide-react";

/**
 * StepProgress — informational stepper for workflow stages.
 *
 * Each step renders in one of three states:
 *   - Completed  (index < currentIndex)        → filled success node + check
 *   - Current    (index === currentIndex)      → filled info node, emphasized label
 *   - Waiting    (index > currentIndex)         → muted node + step number
 *
 * States communicate progress, not permissions (no "Locked"). Presentational
 * only; it does not navigate. Uses shared design tokens.
 *
 * Props:
 *   steps:        [{ key, label }]  — ordered stage descriptors
 *   currentIndex: number            — index of the active (current) stage
 *   orientation:  "horizontal" (default) | "responsive"
 *                 "responsive" lays out horizontally on mobile and vertically
 *                 from the lg breakpoint up (for a right-hand sidebar).
 *   className?:   string
 */
const StepProgress = ({ steps = [], currentIndex = 0, selectedKey = null, orientation = "horizontal", className = "", onStepClick, compact = false, showStatusLabels = true }) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const safeCurrent = Math.max(0, Number(currentIndex) || 0);
  const responsive = orientation === "responsive";

  const listClass = responsive
    ? "flex flex-row items-start gap-0 lg:flex-col lg:gap-0"
    : `flex flex-col ${compact ? "gap-2" : "gap-4"} sm:flex-row sm:items-start sm:gap-0`;

  return (
    <ol className={`${listClass} ${className}`} aria-label="Recruitment progress">
      {steps.map((step, index) => {
        const state =
          index < safeCurrent ? "completed" : index === safeCurrent ? "current" : "waiting";
        const isLast = index === steps.length - 1;
        const isSelected = selectedKey != null && String(selectedKey) === String(step.key);

        const nodeClass =
          state === "completed"
            ? "bg-[var(--success)] text-white border-[var(--success)]"
            : state === "current"
              ? "bg-[var(--primary)] text-white border-[var(--primary)] ring-4 ring-[var(--primary-soft)]"
              : "bg-[var(--surface-muted)] text-[var(--text-soft)] border-[var(--border-soft)]";

        const labelClass =
          state === "current"
            ? "font-semibold text-[var(--text-main)]"
            : state === "completed"
              ? "font-medium text-[var(--text-main)]"
              : "font-medium text-[var(--text-soft)]";

        const doneColor = index < safeCurrent ? "bg-[var(--success)]" : "bg-[var(--border-soft)]";

        // Item layout: centered/stacked on mobile, left-aligned rows on lg
        // (responsive) or always rows on sm+ (horizontal).
        const itemClass = responsive
          ? "flex flex-1 flex-col items-center gap-2 text-center lg:flex-none lg:flex-row lg:items-start lg:gap-3 lg:pb-5 lg:text-left"
          : "flex flex-1 items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center";

        return (
          <li
            key={step.key || index}
            className={itemClass}
            aria-current={state === "current" ? "step" : undefined}
          >
            {/* Node + connector. Horizontal connector on mobile (responsive) or
                sm+ (horizontal); vertical connector on lg (responsive). */}
            <div
              className={
                responsive
                  ? "flex items-center sm:w-full lg:w-auto lg:flex-col lg:self-stretch"
                  : "flex items-center sm:w-full"
              }
            >
              <button
                type="button"
                onClick={() => onStepClick?.(step, index, state)}
                aria-label={`Open ${step.label} details`}
                className={`flex ${compact ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"} shrink-0 items-center justify-center rounded-full border font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${nodeClass} ${isSelected ? "outline outline-2 outline-offset-2 outline-[var(--primary)]" : ""}`}
              >
                {state === "completed" ? <Check size={16} aria-hidden="true" /> : index + 1}
              </button>
              {!isLast &&
                (responsive ? (
                  <>
                    {/* mobile: horizontal connector */}
                    <span
                      className={`mx-2 h-0.5 flex-1 rounded-full transition-colors duration-150 motion-reduce:transition-none lg:hidden ${doneColor}`}
                      aria-hidden="true"
                    />
                    {/* lg: vertical connector */}
                    <span
                      className={`mt-1 hidden w-0.5 flex-1 rounded-full transition-colors duration-150 motion-reduce:transition-none lg:block ${doneColor}`}
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <span
                    className={`mx-2 hidden h-0.5 flex-1 rounded-full transition-colors duration-150 motion-reduce:transition-none sm:block ${doneColor}`}
                    aria-hidden="true"
                  />
                ))}
            </div>
            <button
              type="button"
              onClick={() => onStepClick?.(step, index, state)}
              className={`${responsive ? "min-w-0 lg:pt-1" : "min-w-0 sm:px-1"} rounded-lg px-1 text-inherit outline-none transition hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 motion-reduce:transition-none ${isSelected ? "bg-[var(--primary-soft)]" : ""}`}
              aria-label={`${step.label}: ${state === "completed" ? "Completed" : state === "current" ? "Current step" : "Waiting"}. Open step details.`}
            >
              <span className={`block text-sm leading-tight ${labelClass}`}>{step.label}</span>
              {showStatusLabels ? (
                <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
                  {state === "completed" ? "Completed" : state === "current" ? "Current" : "Waiting"}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default StepProgress;
