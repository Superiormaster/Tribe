export const POST_DELETED_EVENT =
  "tribe:post-deleted";

export const REPOST_DELETED_EVENT =
  "tribe:repost-deleted";

export const SHARE_DELETED_EVENT =
  "tribe:share-deleted";


export function emitPostDeleted(
  postId: number
) {
  window.dispatchEvent(
    new CustomEvent(
      POST_DELETED_EVENT,
      {
        detail: { postId },
      }
    )
  );
}


export function emitRepostDeleted(
  repostId: number
) {
  window.dispatchEvent(
    new CustomEvent(
      REPOST_DELETED_EVENT,
      {
        detail: { repostId },
      }
    )
  );
}


export function emitShareDeleted(
  shareId: number
) {
  window.dispatchEvent(
    new CustomEvent(
      SHARE_DELETED_EVENT,
      {
        detail: { shareId },
      }
    )
  );
}