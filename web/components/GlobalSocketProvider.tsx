"use client";

import {
  createContext,
  ReactNode,
  useContext,
} from "react";

import { UserContext } from "@/components/UserContext";
import { useGlobalSocket } from "@/lib/globalSocket/useGlobalSocket";

type GlobalSocketContextType = {
  socketRef: ReturnType<typeof useGlobalSocket>;
};

const GlobalSocketContext =
  createContext<GlobalSocketContextType | null>(null);

export default function GlobalSocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const userContext = useContext(UserContext);

  if (!userContext) {
    throw new Error(
      "GlobalSocketProvider must be used inside UserContext"
    );
  }

  const { user } = userContext;

  const socketRef = useGlobalSocket(user);

  return (
    <GlobalSocketContext.Provider
      value={{
        socketRef,
      }}
    >
      {children}
    </GlobalSocketContext.Provider>
  );
}

export function useGlobalSocketContext() {
  const context =
    useContext(GlobalSocketContext);

  if (!context) {
    throw new Error(
      "useGlobalSocketContext must be used inside GlobalSocketProvider"
    );
  }

  return context;
}