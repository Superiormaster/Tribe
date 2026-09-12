"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

import InviteSheet from "@/components/invite/InviteSheet";

type InviteContextType = {
  showInvite: () => void;
  hideInvite: () => void;
};

const InviteContext =
  createContext<InviteContextType | null>(null);

export function InviteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const showInvite = () => setOpen(true);
  const hideInvite = () => setOpen(false);

  return (
    <InviteContext.Provider
      value={{
        showInvite,
        hideInvite,
      }}
    >
      {children}

      <InviteSheet
        open={open}
        onClose={hideInvite}
      />
    </InviteContext.Provider>
  );
}

export function useInviteSheet() {
  const context = useContext(InviteContext);

  if (!context) {
    throw new Error(
      "useInviteSheet must be used inside InviteProvider"
    );
  }

  return context;
}