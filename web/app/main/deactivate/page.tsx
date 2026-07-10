"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";
import { UserX, AlertTriangle } from "lucide-react";

export default function DeactivateAccountPage() {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleDeactivate = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await apiRequest("api/users/deactivate/", {
        method: "POST",
      });

      setMessage(res.message || "Account deactivated successfully");
    } catch (err: any) {
      setError(err?.error || "Failed to deactivate account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 text-gray-700 dark:text-gray-300">

      {/* HEADER */}
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
        <UserX size={20} /> Deactivate Account
      </h1>

      {/* WARNING BOX */}
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 flex gap-2">
        <AlertTriangle className="text-red-500" />
        <p className="text-sm text-red-600 dark:text-red-300">
          Deactivating your account will:
          <ul className="list-disc ml-5 mt-2">
            <li>Hide your profile from discovery</li>
            <li>Disable interactions</li>
            <li>Log you out of active sessions</li>
          </ul>
        </p>
      </div>

      {/* CONFIRM CHECKBOX */}
      <label className="flex items-center gap-2 mb-4 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={() => setConfirmed(!confirmed)}
        />
        I understand this action is temporary and can affect my account visibility.
      </label>

      {/* BUTTON */}
      <button
        onClick={handleDeactivate}
        disabled={!confirmed || loading}
        className={`w-full py-2 rounded-lg text-white ${
          !confirmed
            ? "bg-gray-400"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {loading ? "Processing..." : "Deactivate Account"}
      </button>

      {/* FEEDBACK */}
      {message && (
        <p className="mt-3 text-green-600 text-sm">{message}</p>
      )}

      {error && (
        <p className="mt-3 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}