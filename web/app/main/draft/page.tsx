'use client';

import { useEffect, useState } from "react";
import AppLink from '@/components/AppLink';
import toast from "react-hot-toast";
import {
  getAllPostDrafts,
  deletePostDraft,
} from "@/lib/messageDB";
import type { PostDraft } from "@/lib/messageDB";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<PostDraft[]>([]);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    const data = await getAllPostDrafts();
    setDrafts(data);
  };

  const handleDelete = async (id: string) => {
    await deletePostDraft(id);

    setDrafts((prev) =>
      prev.filter((d) => d.draftId !== id)
    );

    toast.success("Draft deleted");
  };

  const formatDate = (time: number) => {
    const date = new Date(time);
    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date >= today) {
      return `Today • ${date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }

    if (date >= yesterday) {
      return `Yesterday • ${date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-2xl text-gray-700 dark:text-gray-200 my-20 mx-auto p-4">

      <h1 className="text-2xl font-bold mb-6">
        📝 Drafts • {drafts.length}
      </h1>

      {drafts.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No saved drafts
        </div>
      )}

      <div className="space-y-4">

        {drafts.map((draft) => {

          const imageCount =
            (draft.imageFiles?.length || 0) +
            (draft.imageUrls?.length || 0);

          const hasVideo = !!draft.video;

          return (
            <div
              key={draft.draftId}
              className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <AppLink
                href={`/main/create-post?draftId=${draft.draftId}`}
              >
                <div className="space-y-2 cursor-pointer">

                  <h2 className="font-semibold text-lg">
                    {draft.title}
                  </h2>

                  {draft.communityName && (
                    <p className="text-sm text-indigo-600">
                      {draft.communityName}
                    </p>
                  )}

                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                    {draft.content || "No text"}
                  </p>

                  <div className="flex gap-4 text-sm text-gray-500">

                    {imageCount > 0 && (
                      <span>
                        🖼 {imageCount} Image
                        {imageCount > 1 ? "s" : ""}
                      </span>
                    )}

                    {hasVideo && (
                      <span>
                        {draft.title === "Entertainment"
                          ? "🎬 Reel"
                          : "🎥 Video"}
                      </span>
                    )}

                  </div>

                  <div className="text-xs text-gray-400">
                    {formatDate(draft.updated_at)}
                  </div>

                </div>
              </AppLink>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() =>
                    handleDelete(draft.draftId)
                  }
                  className="text-red-500 hover:text-red-600"
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}