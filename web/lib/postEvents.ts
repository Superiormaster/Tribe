export const POST_DELETED_EVENT = "tribe:post-deleted";
export const REPOST_DELETED_EVENT = "tribe:repost-deleted";

export function emitPostDeleted(postId: number) {
  window.dispatchEvent(
    new CustomEvent(POST_DELETED_EVENT, {
      detail: { postId },
    })
  );
}

export function emitRepostDeleted(repostId: number) {
  window.dispatchEvent(
    new CustomEvent(REPOST_DELETED_EVENT, {
      detail: { repostId },
    })
  );
}