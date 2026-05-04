"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/utils/api";

export default function CommunitySettingsPage({
  communityId,
}: {
  communityId: string;
}) {
  const router = useRouter();
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    if (!communityId) return;

    const fetchData = async () => {
      const data = await apiRequest(
        `api/communities/${communityId}/`
      );
      setCommunity(data);
    };

    fetchData();
  }, [communityId]);

  if (!community) return <p className="p-4">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl text-gray-700 dark:text-white font-bold">Community Settings</h1>

      <div>
        <p className="text-xl font-medium text-gray-700 dark:text-white">Name</p>
        <input
          className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"
          value={community.name}
          readOnly
        />
      </div>

      <div>
        <p className="text-xl font-medium text-gray-700 dark:text-white">Description</p>
        <textarea
          className="w-full p-2 bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 border rounded"
          value={community.description}
          readOnly
        />
      </div>

      <p>Owner: {community.owner?.username}</p>

      <div className="space-y-3 pt-4">
        <button className="w-full bg-yellow-500 text-black p-2 rounded">
          Edit Community
        </button>

        <button className="w-full bg-red-500 text-white p-2 rounded">
          Delete Community
        </button>

        <button
          onClick={() => router.back()}
          className="w-full text-black bg-gray-200 p-2 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}