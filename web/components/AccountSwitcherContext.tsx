"use client";

import { createContext, useContext, useState } from "react";
import AccountSwitcherModal from "@/components/AccountSwitcherModal";

const AccountSwitcherContext = createContext<any>(null);

export function AccountSwitcherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AccountSwitcherContext.Provider
      value={{
        openSwitcher: () => setOpen(true),
        closeSwitcher: () => setOpen(false),
      }}
    >
      {children}

      <AccountSwitcherModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </AccountSwitcherContext.Provider>
  );
}

export const useAccountSwitcher = () => {
  const context = useContext(AccountSwitcherContext);

  if (!context) {
    throw new Error(
      "useAccountSwitcher must be used inside AccountSwitcherProvider"
    );
  }

  return context;
};