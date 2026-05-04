"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getAccounts } from "@/utils/accounts";
import { useAuth } from "@/lib/authStore";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/utils/api";
import { storeRefreshToken, getRefreshToken } from "@/lib/keyStore"
import { setAccessToken } from "@/utils/api"

export default function AccountSwitcherModal({ open, onClose, onSwitch }) {
  const [accounts, setAccounts] = useState([]);
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const switchAccount = async (acc: Account) => {
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* slide up panel */}
          <motion.div
            className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-4 z-50"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            <h2 className="text-center font-bold mb-4">
              Switch Account
            </h2>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <motion.div
                  key={acc.email}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
                  onClick={() => switchAccount(acc)}
                >
                  <AvatarMorph src={acc.avatar} />

                  <div>
                    <p className="font-semibold">{acc.username}</p>
                    <p className="text-xs text-gray-500">{acc.email}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AvatarMorph({ src }) {
  return (
    <motion.img
      src={src || "/default-avatar.png"}
      className="w-10 h-10 rounded-full object-cover"
      layoutId={`avatar-${src}`}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    />
  );
}