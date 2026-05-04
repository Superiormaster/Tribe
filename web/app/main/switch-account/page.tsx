"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccounts } from "@/utils/accounts";
import { apiRequest } from "@/utils/api";
import { useAuth } from "@/lib/authStore";
import { storeRefreshToken, getRefreshToken } from "@/lib/keyStore"
import { setAccessToken } from "@/utils/api"

type Account = {
  email: string;
  type: "google" | "password";
  avatar?: string;
  username?: string;
};

export default function SwitchAccountPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);

  // ✅ Use helper (clean)
  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const handleSwitch = async (acc: Account) => {
    try {
      // 1. load refresh token from IndexedDB (per account)
      const refresh = await getRefreshToken(acc.email);
  
      if (!refresh) {
        router.push("/auth/login");
        return;
      }
  
      // 2. refresh access token
      const res = await apiRequest("api/users/refresh/", {
        method: "POST",
        data: { refresh },
      });
  
      setAccessToken(res.access);
  
      // 3. set active account locally
      localStorage.setItem("selected_account", acc.email);
  
      // 4. fetch user
      const me = await apiRequest("api/users/me/");
      setUser(me);
  
      window.dispatchEvent(new Event("auth-changed"));
  
      router.push("/main/home");
  
    } catch (err) {
      console.error("Switch failed", err);
    }
  };

  const removeAccount = (email: string) => {
    const updated = accounts.filter(acc => acc.email !== email);
    setAccounts(updated);

    // ✅ Still okay to update localStorage here
    localStorage.setItem("accounts", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-950">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Switch Account
      </h1>

      <div className="w-full max-w-md space-y-3">
        {accounts.length === 0 && (
          <p className="text-center text-gray-500">No saved accounts</p>
        )}

        {accounts.map((acc) => (
          <div
            key={acc.email}
            className="flex items-center justify-between p-4 rounded-2xl shadow border bg-white dark:bg-gray-900"
          >
            <button
              onClick={() => handleSwitch(acc)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <img
                src={acc.avatar || "/default-avatar.png"}
                className="w-10 h-10 rounded-full"
                alt="avatar"
              />

              <div>
                <p className="font-semibold text-gray-800 dark:text-white">
                  {acc.username || acc.email}
                </p>
                <p className="text-sm text-gray-500">{acc.email}</p>
              </div>
            </button>

            <span className="text-sm mr-3">
              {acc.type === "google" ? "⚡" : "🔒"}
            </span>

            <button
              onClick={() => removeAccount(acc.email)}
              className="text-red-500 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/auth/login")}
        className="mt-6 text-indigo-600 font-medium"
      >
        + Add another account
      </button>
    </div>
  );
}