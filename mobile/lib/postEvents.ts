import { DeviceEventEmitter } from "react-native";

export const POST_DELETED_EVENT =
  "tribe:post-deleted";

export const REPOST_DELETED_EVENT =
  "tribe:repost-deleted";

export const SHARE_DELETED_EVENT =
  "tribe:share-deleted";

export function emitPostDeleted(
  postId: number
) {
  DeviceEventEmitter.emit(
    POST_DELETED_EVENT,
    { postId }
  );
}

export function emitRepostDeleted(
  repostId: number
) {
  DeviceEventEmitter.emit(
    REPOST_DELETED_EVENT,
    { repostId }
  );
}

export function emitShareDeleted(
  shareId: number
) {
  DeviceEventEmitter.emit(
    SHARE_DELETED_EVENT,
    { shareId }
  );
}