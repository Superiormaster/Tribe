"use client";

import SupportForm from "@/components/support/SupportForm";
import MySupportRequests from "@/components/support/MySupportRequests";

export default function SupportPage() {
  return (
    <div className="max-w-2xl text-gray-700 dark:text-gray-400 my-20 mx-auto p-4 space-y-6">

      <div>
        <h1 className="text-2xl font-bold dark:text-white">
          Support
        </h1>

        <p className="text-gray-500 mt-1">
          Contact the Tribe team for account,
          community or special requests.
        </p>
      </div>

      <SupportForm />

      <MySupportRequests />

    </div>
  );
}