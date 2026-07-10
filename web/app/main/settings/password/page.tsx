"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await apiRequest("api/users/change-password/", {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      setMessage(res.message || "Password updated successfully");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mt-20 text-gray-700 dark:text-gray-300 mx-auto p-4">
      
      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Lock size={20} /> Change Password
      </h1>

      {/* OLD PASSWORD */}
      <div className="relative mb-3">
        <input
          type={showOld ? "text" : "password"}
          placeholder="Current password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full p-3 border rounded-lg dark:bg-gray-900 pr-10"
        />

        <button
          type="button"
          onClick={() => setShowOld(!showOld)}
          className="absolute right-3 top-3 text-gray-500"
        >
          {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* NEW PASSWORD */}
      <div className="relative mb-3">
        <input
          type={showNew ? "text" : "password"}
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-3 border rounded-lg dark:bg-gray-900 pr-10"
        />

        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="absolute right-3 top-3 text-gray-500"
        >
          {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* BUTTON */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
      >
        {loading ? "Updating..." : "Update Password"}
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