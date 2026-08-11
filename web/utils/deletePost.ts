import { apiRequest } from "@/utils/api";
import {
  removePostFromAllFeedCaches,
} from "@/lib/feedDb";

import {
  emitPostDeleted,
  emitRepostDeleted,
} from "@/lib/postEvents";

export async function deletePostEverywhere(
  postId: number,
  type: "post" | "repost" = "post"
) {
  const id = Number(postId);

  if (!id) {
    throw new Error("Invalid post ID");
  }
  
  if (type === "repost") {
    await apiRequest(
      `api/reposts/${id}/`,
      {
        method: "DELETE",
      }
    );
  } else {
    await apiRequest(
      `api/post/${id}/`,
      {
        method: "DELETE",
      }
    );
  }

  await removePostFromAllFeedCaches(id);

  if (type === "repost") {
    emitRepostDeleted(id);
  } else {
    emitPostDeleted(id);
  }
}