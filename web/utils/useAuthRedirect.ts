// utils/useAuthRedirect.ts
"use client";
import { useEffect, useContext } from "react";
import { useNavigation } from "@/utils/useNavigation";
import { UserContext } from "@/components/UserContext";

export default function useAuthRedirect() {
  const { replace } = useNavigation();
  const { user, loadingUser } = useContext(UserContext)!;

  useEffect(() => {
    if (!loadingUser && user) {
      replace("/main/home");
    }
  }, [loadingUser, user, replace]);
}