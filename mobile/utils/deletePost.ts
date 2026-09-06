import { apiRequest } from "@/utils/api";

import {
  removePostFromAllFeedCaches,
  removeRepostFromAllFeedCaches,
  removeShareFromAllFeedCaches,
} from "@/lib/feedDb";

import {
  emitPostDeleted,
  emitRepostDeleted,
  emitShareDeleted,
} from "@/lib/postEvents";

export async function deletePostEverywhere(
  id: number,
  type: "post" | "repost" | "share" = "post"
) {
  const itemId = Number(id);

  if (!itemId) {
    throw new Error("Invalid ID");
  }

  if (type === "repost") {
    await apiRequest(
      `api/reposts/${itemId}/`,
      {
        method: "DELETE",
      }
    );

    await removeRepostFromAllFeedCaches(
      itemId
    );

    emitRepostDeleted(itemId);

    return;
  }

  if (type === "share") {
    await apiRequest(
      `api/shares/${itemId}/`,
      {
        method: "DELETE",
      }
    );

    await removeShareFromAllFeedCaches(
      itemId
    );

    emitShareDeleted(itemId);

    return;
  }

  await apiRequest(
    `api/post/${itemId}/`,
    {
      method: "DELETE",
    }
  );

  await removePostFromAllFeedCaches(
    itemId
  );

  emitPostDeleted(itemId);
}