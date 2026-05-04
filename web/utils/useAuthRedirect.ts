// utils/useAuthRedirect.ts
"use client";
import { useEffect, useContext } from "react";
import { useRouter } from "next/navigation"; 
import { UserContext } from "@/components/UserContext";

export default function useAuthRedirect() {
  const router = useRouter();
  const { user, loadingUser } = useContext(UserContext)!;

  useEffect(() => {
    if (!loadingUser && user) {
      router.replace("/main/home");
    }
  }, [loadingUser, user, router]);
}