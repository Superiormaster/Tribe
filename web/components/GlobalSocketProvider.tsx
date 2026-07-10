"use client";

import { useContext, useRef } from "react";
import { UserContext } from "@/components/UserContext";
import { useGlobalSocket } from "@/lib/globalSocket/useGlobalSocket";

export default function GlobalSocketProvider() {
  const renders = useRef(0);
  renders.current++;
  
  console.log("GlobalSocketProvider", renders.current);
  const { user } =
    useContext(UserContext)!;

  useGlobalSocket(user);

  return null;
}