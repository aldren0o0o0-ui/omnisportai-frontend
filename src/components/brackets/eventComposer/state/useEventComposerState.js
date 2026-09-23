import { useState, useCallback } from 'react';

export const useEventComposerState = () => {
  const [selectedControlId, setSelectedControlId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputBoolean, setInputBoolean] = useState(true);

  const resetComposerState = useCallback((defaultControlId = null) => {
    setSelectedControlId(defaultControlId);
    setSelectedTeamId("");
    setSelectedPlayerId("");
    setInputValue("");
    setInputBoolean(true);
  }, []);

  const handleControlSelect = useCallback((controlId) => {
    if (selectedControlId !== controlId) {
      setSelectedControlId(controlId);
      setSelectedTeamId("");
      setSelectedPlayerId("");
      setInputValue("");
      setInputBoolean(true);
    }
  }, [selectedControlId]);

  return {
    state: { selectedControlId, selectedTeamId, selectedPlayerId, inputValue, inputBoolean },
    actions: {
      setSelectedTeamId,
      setSelectedPlayerId,
      setInputValue,
      setInputBoolean,
      resetComposerState,
      handleControlSelect
    }
  };
};
