"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { getAccounts, getActiveAccount } from "@/utils/accounts";
import { switchAccount } from "@/lib/switchAccount";
import { logout } from "@/utils/auth"

type Account = {
  email: string;
  type: "google" | "password";
  avatar?: string;
  username?: string;
};

export default function SwitchAccountPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  // ✅ Use helper (clean)
  useEffect(() => {
    setAccounts(getAccounts());
    setActiveAccount(getActiveAccount());
  }, []);

  const removeAccount = (email: string) => {
    const updated = accounts.filter(acc => acc.email !== email);
    setAccounts(updated);

    // ✅ Still okay to update localStorage here
    localStorage.setItem("accounts", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center my-24 p-2">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Switch Account
      </h1>

      <div className="w-full max-w-sm mx-auto space-y-3">
        {accounts.length === 0 && (
          <p className="text-center text-gray-500">No saved accounts</p>
        )}

        {accounts.map((acc) => (
          <div
            key={acc.email}
            className="flex items-center gap-3 p-4 rounded-2xl shadow border bg-white dark:bg-gray-900"
          >
          
            {/* ACCOUNT BUTTON */}
            <button
              onClick={() => {
                setActiveAccount(acc.email);
                switchAccount(acc.email);
              }}
              className="items-center gap-3 min-w-0 flex-1 text-left overflow-hidden"
            >
          
              <img
                src={acc.avatar || "/default-avatar.png"}
                className="w-10 h-10 rounded-full shrink-0"
                alt="avatar"
              />
          
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-white truncate">
                  {acc.username || acc.email}
                </p>
          
                <p className="text-sm text-gray-500 truncate">
                  {acc.email}
                </p>
              </div>
          
            </button>
          
            {activeAccount === acc.email && (
              <CheckCircle
                className="w-5 h-5 text-green-500 shrink-0"
                fill="currentColor"
              />
            )}
          
            {/* TYPE */}
            <span className="text-sm shrink-0">
              {acc.type === "google" ? "⚡" : "🔒"}
            </span>
          
            {/* REMOVE */}
            <button
              onClick={() => removeAccount(acc.email)}
              className="text-red-500 text-sm shrink-0"
            >
              ✕
            </button>
          
          </div>
        ))}
      </div>

      <button
        onClick={async () => {

          await logout()

          window.location.href =
            "/auth/login"

        }}
        className="mt-6 text-indigo-600 font-medium"
      >
        + Add another account
      </button>
    </div>
  );
}