import FormSelect from "../common/FormSelect";

const DuoEntryForm = ({
  values = ["", ""],
  options = [],
  disabled = false,
  onChange,
}) => {
  const [firstValue = "", secondValue = ""] = Array.isArray(values) ? values : ["", ""];
  const hasDuplicate = firstValue && secondValue && String(firstValue) === String(secondValue);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <p className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
        Select two different athletes to form a doubles pair.
      </p>
      <FormSelect
        label="Athlete 1"
        value={firstValue}
        options={options}
        disabled={disabled}
        onChange={(next) => onChange?.([next, secondValue])}
        placeholder="Select athlete"
        keyPrefix="duo-player-1"
      />

      <FormSelect
        label="Athlete 2"
        value={secondValue}
        options={options}
        disabled={disabled}
        onChange={(next) => onChange?.([firstValue, next])}
        placeholder="Select athlete"
        keyPrefix="duo-player-2"
      />

      {options.length === 0 ? (
        <p className="md:col-span-2 text-xs text-amber-700 dark:text-amber-300">
          No athletes available yet. Athletes appear here once team rosters are submitted.
        </p>
      ) : null}
      {hasDuplicate ? (
        <p className="md:col-span-2 text-xs text-amber-700 dark:text-amber-300">
          A doubles pair must contain two different athletes.
        </p>
      ) : null}
    </div>
  );
};

export default DuoEntryForm;
