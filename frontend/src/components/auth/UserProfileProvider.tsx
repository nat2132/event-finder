import React, { createContext, useContext } from "react";
import { useBackendUserProfile } from "../use-backend-user-profile";

const UserProfileContext = createContext<ReturnType<typeof useBackendUserProfile> | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useBackendUserProfile();
  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
}
