import { useEffect } from 'react';

export const useComposerReset = ({ match, configHash, validatedConfig, resetComposerState }) => {
  useEffect(() => {
    const defaultControlId = validatedConfig?.controls?.[0]?.id || null;
    resetComposerState(defaultControlId);
  }, [match?.sport_id, match?.id, configHash, resetComposerState, validatedConfig?.controls]);
};
