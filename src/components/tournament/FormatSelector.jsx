const FormatSelector = ({ onChange, value, className = "" }) => {

  return (

    <select name="tournament_type" className={className} onChange={onChange} value={value}>

      <option value="">Select a Tournament Format</option>

      <option value="round_robin">
        Round Robin
      </option>

      <option value="single_elimination">
        Single Elimination
      </option>

      <option value="double_elimination">
        Double Elimination
      </option>

    </select>

  );
};

export default FormatSelector;
