"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";
import toast from "react-hot-toast";

export default function SupportForm() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    category: "community",
    subject: "",
    message: "",
  });

  async function submit() {
    if (!form.subject.trim()) {
      return toast.error("Enter a subject");
    }

    if (!form.message.trim()) {
      return toast.error("Enter your request");
    }

    try {
      setLoading(true);

      await apiRequest(
        "api/feedback/support/",
        {
          method: "POST",
          data: form,
        }
      );

      toast.success(
        "Support request submitted."
      );

      setForm({
        category: "community",
        subject: "",
        message: "",
      });

    } catch {
      toast.error(
        "Unable to submit request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border dark:border-gray-700 p-4 space-y-4">

      <h2 className="font-semibold text-lg">
        New Support Request
      </h2>
  
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 text-sm">
        <h3 className="font-semibold text-blue-700 dark:text-blue-300">
          Before you submit
        </h3>
      
        <ul className="mt-2 space-y-1 list-disc pl-5 text-gray-700 dark:text-gray-300">
          <li>Choose the category that best matches your request.</li>
          <li>Use a clear subject so we can identify your issue quickly.</li>
          <li>Provide as much detail as possible, including usernames or community names if relevant.</li>
          <li>Support is for account and community requests, not feature suggestions or reports.</li>
          <li>We'll review your request and update its status in <strong>My Requests</strong>.</li>
        </ul>
      </div>

      <select
        value={form.category}
        onChange={(e) =>
          setForm({
            ...form,
            category: e.target.value,
          })
        }
        className="w-full rounded-lg border p-2 dark:bg-gray-900"
      >
        <option value="community">Community</option>
        <option value="media_change">Community Media Change</option>
        <option value="account">Account</option>
        <option value="other">Other</option>
      </select>
      
     {/* <option value="ownership_transfer">Community Ownership Transfer</option>
        <option value="verification">Verification</option>
        <option value="billing">Billing</option>*/}
      
      {form.category === "media_change" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            ⚠️ Community Media Restoration
          </p>
      
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Use this option only if you want to restore your community's previous media type
            (for example, change <strong>Videos</strong> back to <strong>Reels</strong>).
            Each request is reviewed individually and approval is <strong>not guaranteed</strong>.
            Please include your community name and explain why you want the media type restored.
          </p>
        </div>
      )}

      <input
        placeholder="Subject"
        value={form.subject}
        onChange={(e)=>
          setForm({
            ...form,
            subject:e.target.value,
          })
        }
        className="w-full rounded-lg border p-2 dark:bg-gray-900"
      />

      <textarea
        rows={6}
        placeholder="Describe your request..."
        value={form.message}
        onChange={(e)=>
          setForm({
            ...form,
            message:e.target.value,
          })
        }
        className="w-full rounded-lg border p-2 dark:bg-gray-900"
      />

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-indigo-600 text-white rounded-lg p-3"
      >
        {loading
          ? "Submitting..."
          : "Submit Request"}
      </button>

    </div>
  );
}