import FormSelect from "../common/FormSelect";

const SoloEntryForm = ({
  value = "",
  options = [],
  disabled = false,
  onChange,
}) => (
  <div className="space-y-1.5">
    <FormSelect
      label="Athlete"
      value={value}
      options={options}
      disabled={disabled}
      onChange={onChange}
      placeholder="Select athlete"
      keyPrefix="solo-player"
    />
    {options.length === 0 ? (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        No athletes available yet. Athletes appear here once team rosters are submitted.
      </p>
    ) : null}
  </div>
);

export default SoloEntryForm;
