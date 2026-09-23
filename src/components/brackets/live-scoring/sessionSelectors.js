export const deriveSessionAuthority = ({ socketStatus, isSubmitting = false, isUndoing = false } = {}) => {
  const authenticated = String(socketStatus || "").toLowerCase() !== "auth_required";
  return {
    isAuthenticatedForScoring: authenticated,
    canSubmitSessionActions: authenticated && !isSubmitting && !isUndoing,
  };
};
