import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepProgress from '../common/StepProgress';
import AppModal from '../common/AppModal';

const STEP_DESCRIPTIONS = {
  workspace: 'Creates the Intramural workspace and its competition settings.',
  assignments: 'Assigns department managers, sports facilitators, and required coaches.',
  teams: 'Collects the team, solo, and duo entries that will participate.',
  approvals: 'Sports facilitators verify submitted entries for their assigned sports.',
  brackets: 'Builds the official Match structure from approved competition entries.',
  schedule: 'Assigns bracket Matches to valid dates, times, and venues.',
  live: 'Runs Matches, records official results, and updates standings.',
};

const SetupProgressChecklist = ({ items = [], title = 'Setup Progress', activeKey = null, onStepSelect, compact = false, showStatusLabels = true }) => {
  const navigate = useNavigate();
  const [selectedStep, setSelectedStep] = useState(null);

  const completed = items.filter((item) => item.done).length;
  const currentIndex = items.findIndex((item) => !item.done);
  const effectiveIndex = currentIndex === -1 ? items.length : currentIndex;

  const steps = items.map((item) => ({
    key: item.key,
    label: item.label,
    detail: item.detail,
  }));

  const modalState = useMemo(() => {
    if (!selectedStep) return null;
    const { item, index } = selectedStep;
    const locked = index > effectiveIndex;
    const completedStep = Boolean(item.done) && !locked;
    const previous = index > 0 ? items[index - 1] : null;
    return {
      item,
      locked,
      completedStep,
      previous,
      statusLabel: locked ? 'Not started' : completedStep ? 'Completed' : 'Ready for action',
    };
  }, [effectiveIndex, items, selectedStep]);

  const closeModal = () => setSelectedStep(null);
  const openStep = () => {
    if (!modalState?.item?.to || modalState.locked) return;
    const target = modalState.item.to;
    closeModal();
    navigate(target);
  };

  if (items.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">{title}</h3>
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {completed} of {items.length} complete
        </span>
      </div>
      <StepProgress
        steps={steps}
        currentIndex={effectiveIndex}
        selectedKey={activeKey}
        compact={compact}
        showStatusLabels={showStatusLabels}
        onStepClick={(_step, index) => {
          if (index > effectiveIndex) {
            setSelectedStep({ item: items[index], index });
            return;
          }
          onStepSelect?.(items[index]);
        }}
      />

      <AppModal
        open={Boolean(modalState)}
        onClose={closeModal}
        title={modalState?.item?.label || 'Setup step'}
        subtitle={STEP_DESCRIPTIONS[modalState?.item?.key] || 'Review this Intramural setup step.'}
        maxWidthClass="max-w-lg"
      >
        {modalState ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Status</p>
              <p className="mt-1 font-semibold text-[var(--text-main)]">{modalState.statusLabel}</p>
            </div>

            {modalState.locked ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Finish <strong>{modalState.previous?.label || 'the previous step'}</strong> before starting this step.
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  {modalState.completedStep ? 'Latest recorded outcome' : 'What to do next'}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-main)]">{modalState.item.detail}</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="os-btn-ghost-soft min-h-11">Close</button>
              {!modalState.locked && modalState.item.to ? (
                <button type="button" onClick={openStep} className="os-btn-primary-soft min-h-11">
                  {modalState.completedStep ? 'Review step' : 'Open step'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </AppModal>
    </div>
  );
};

export default SetupProgressChecklist;
