const FORM_SELECT_CLASSES =
  "w-full min-h-[var(--control-height-lg)] rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-[var(--control-padding-x)] py-2 text-sm text-[var(--text-main)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--text-soft)] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border-soft))] focus:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60";

const FormSelect = ({
  label,
  value = "",
  options = [],
  disabled = false,
  onChange,
  placeholder = "Select an option",
  keyPrefix = "form-select",
}) => {
  const generatedId = useId();
  return (
  <div className="space-y-1.5">
    {label ? (
      <label htmlFor={generatedId} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
    ) : null}
    <select
      id={generatedId}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      className={FORM_SELECT_CLASSES}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={`${keyPrefix}-${option.id}`} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
  );
};

export default FormSelect;
import { useId } from "react";
