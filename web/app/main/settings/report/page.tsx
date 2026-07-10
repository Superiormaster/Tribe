"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";
import {
  Bug,
  ShieldAlert,
  AlertTriangle,
  MessageSquareWarning,
} from "lucide-react";

export default function ReportPage() {
  const [reportType, setReportType] = useState("");
  const [message, setMessage] = useState("");
  
  const submitReport = async () => {
    if (!message.trim()) return;
  
    try {
      await apiRequest(
        "api/feedback/problem-reports/",
        {
          method: "POST",
          data: {
            report_type: reportType,
            message,
          },
        }
      );
  
      alert("Report submitted");
  
      setMessage("");
      setReportType("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit report");
    }
  };

  return (
    <div className="max-w-2xl my-20 mx-auto p-4">
      <h1 className="text-2xl text-gray-700 dark:text-gray-400 font-bold mb-2">
        Report a Problem
      </h1>

      <p className="text-gray-600 dark:text-gray-500 text-muted-foreground mb-6">
        Help us improve Tribe by reporting bugs,
        abuse, or other issues.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => setReportType("bug")}
          className={`w-full rounded-xl border p-4 text-left text-gray-600 dark:text-gray-300 transition-all ${
            reportType === "bug"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300 dark:border-gray-700"
          }`}
        >
          <div className="flex gap-3">
            <Bug />
            <span>Bug Report</span>
          </div>
        </button>

        <button
          onClick={() => setReportType("abuse")}
          className={`w-full rounded-xl border p-4 text-gray-600 dark:text-gray-300 text-left transition-all ${
            reportType === "abuse"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300 dark:border-gray-700"
          }`}
        >
          <div className="flex gap-3">
            <ShieldAlert />
            <span>Abuse / Harassment</span>
          </div>
        </button>

        <button
          onClick={() => setReportType("content")}
          className={`w-full text-gray-600 dark:text-gray-300 rounded-xl border p-4 text-left transition-all ${
            reportType === "content"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300 dark:border-gray-700"
          }`}
        >
          <div className="flex gap-3">
            <AlertTriangle />
            <span>Inappropriate Content</span>
          </div>
        </button>

        <button
          onClick={() => setReportType("other")}
          className={`w-full rounded-xl border p-4 text-gray-600 dark:text-gray-300 text-left transition-all ${
            reportType === "other"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300 dark:border-gray-700"
          }`}
        >
          <div className="flex gap-3">
            <MessageSquareWarning />
            <span>Other Issue</span>
          </div>
        </button>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue..."
        className="w-full text-gray-600 dark:text-gray-300 dark:bg-gray-900 bg-gray-300 focus:outline-none border-indigo-600 h-40 mt-5 rounded-xl border p-4 resize-none"
      />

      <button
        onClick={submitReport}
        disabled={!message.trim()}
        className="w-full mt-5 rounded-xl bg-primary bg-indigo-600 text-white py-3 font-medium"
      >
        Submit Report
      </button>
    </div>
  );
}