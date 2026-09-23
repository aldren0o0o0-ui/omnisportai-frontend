import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { normalizeProfileTarget } from "./profileUtils";

const ProfileDrawerContext = createContext(null);

export const ProfileDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);

  const openProfile = useCallback((target) => {
    const normalized = normalizeProfileTarget(target);
    if (!normalized) return;

    setProfileTarget(normalized);
    setIsOpen(true);
  }, []);

  const closeProfile = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      profileTarget,
      openProfile,
      closeProfile,
    }),
    [isOpen, profileTarget, openProfile, closeProfile]
  );

  return (
    <ProfileDrawerContext.Provider value={value}>
      {children}
    </ProfileDrawerContext.Provider>
  );
};

export const useProfileDrawer = () => {
  const context = useContext(ProfileDrawerContext);
  if (!context) {
    throw new Error("useProfileDrawer must be used within a ProfileDrawerProvider");
  }
  return context;
};

export default ProfileDrawerContext;
