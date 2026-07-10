"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getAccounts } from "@/utils/accounts";
import { switchAccount } from "@/lib/switchAccount";

export default function AccountSwitcherModal({ open, onClose, onSwitch }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            className="fixed z-50 inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* slide up panel */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-4 z-50"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            <h2 className="text-gray-700 dark:text-gray-300 text-center font-bold mb-4">
              Switch Account
            </h2>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <motion.div
                  key={acc.email}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
                  onClick={() => switchAccount(acc.email)}
                >
                  <AvatarMorph src={acc.avatar} />

                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-semibold">{acc.username}</p>
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