import FormSelect from "../common/FormSelect";

const TeamEntryForm = ({
  value = "",
  options = [],
  disabled = false,
  onChange,
}) => (
  <div className="space-y-1.5">
    <FormSelect
      label="Team"
      value={value}
      options={options}
      disabled={disabled}
      onChange={onChange}
      placeholder="Select team"
      keyPrefix="team-entry-option"
    />
    {options.length === 0 ? (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        No eligible team available yet for this sport. Teams appear here once departments submit rosters.
      </p>
    ) : null}
  </div>
);

export default TeamEntryForm;
