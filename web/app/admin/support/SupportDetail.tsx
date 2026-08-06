"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";
import toast from "react-hot-toast";
import { useNavigation } from "@/utils/useNavigation";

export default function SupportDetail({
  id,
}: {
  id: string;
}) {
  const { back } = useNavigation();

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [item, setItem] = useState<any>(null);

  const [adminNote, setAdminNote] =
    useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiRequest(
        `api/admin/support/${id}/`
      );

      setItem(data);
      setAdminNote(data.admin_note || "");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    status: string
  ) {
    try {
      setSaving(true);

      await apiRequest(
        `api/admin/support/${id}/`,
        {
          method: "PATCH",
          data: {
            status,
            admin_note: adminNote,
          },
        }
      );

      toast.success("Updated");

      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequest() {
    if (
      !confirm(
        "Delete this request?"
      )
    ) {
      return;
    }

    try {
      await apiRequest(
        `api/admin/support/${id}/`,
        {
          method: "DELETE",
        }
      );

      toast.success("Deleted");

      back();
    } catch {
      toast.error("Unable to delete");
    }
  }

  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <button
        onClick={back}
        className="text-blue-600"
      >
        ← Back
      </button>

      <div className="border text-gray-700 dark:text-gray-300 rounded-xl p-5 space-y-4">

        <div>

          <h1 className="text-2xl font-bold">
            {item.subject}
          </h1>

          <p className="text-gray-500">
            {item.category}
          </p>

        </div>

        <div className="grid grid-cols-2 gap-4">

          <div>

            <p className="text-sm text-gray-500">
              User
            </p>

            <p>
              {item.user.username}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Email
            </p>

            <p>
              {item.user.email}
            </p>

          </div>

        </div>

        <div>

          <p className="text-sm text-gray-500">
            Status
          </p>

          <p>{item.status}</p>

        </div>

        <div>

          <p className="text-sm text-gray-500 mb-2">
            User Message
          </p>

          <div className="border rounded-lg p-4 whitespace-pre-wrap">
            {item.message}
          </div>

        </div>

        <div>

          <p className="font-medium mb-2">
            Admin Note
          </p>

          <textarea
            rows={5}
            value={adminNote}
            onChange={(e)=>
              setAdminNote(
                e.target.value
              )
            }
            className="w-full border rounded-lg p-3"
          />

        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

          <button
            disabled={saving}
            onClick={() =>
              updateStatus(
                "pending"
              )
            }
            className="bg-yellow-500 text-white rounded-lg p-2"
          >
            Pending
          </button>

          <button
            disabled={saving}
            onClick={() =>
              updateStatus(
                "in_review"
              )
            }
            className="bg-blue-600 text-white rounded-lg p-2"
          >
            Review
          </button>

          <button
            disabled={saving}
            onClick={() =>
              updateStatus(
                "resolved"
              )
            }
            className="bg-green-600 text-white rounded-lg p-2"
          >
            Resolve
          </button>

          <button
            disabled={saving}
            onClick={() =>
              updateStatus(
                "rejected"
              )
            }
            className="bg-red-600 text-white rounded-lg p-2"
          >
            Reject
          </button>

          <button
            disabled={saving}
            onClick={() =>
              updateStatus(
                "closed"
              )
            }
            className="bg-gray-700 text-white rounded-lg p-2"
          >
            Close
          </button>

        </div>

        <button
          onClick={deleteRequest}
          className="w-full bg-red-700 text-white rounded-lg p-3"
        >
          Delete Request
        </button>

      </div>

    </div>
  );
}