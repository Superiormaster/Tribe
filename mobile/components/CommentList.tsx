import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/utils/timeAgo";
import ReportCommentModal from "@/components/ReportCommentModal";
import { connectCommentsSocket } from "@/lib/comment-socket";
import { formatCount } from "@/utils/formatCount";
import { ThumbsUp } from "lucide-react";

type ReplyTarget = {
  id: number | null;
  type: "reply" | "comment" | null;
  username?: string;
};

type User = {
  id: number;
  username: string;
  avatar?: string;
};

type Comment = {
  id: number;
  client_id?: string;
  text: string;
  created_at: string;
  user: User;
  replies?: Comment[];
  likes_count?: number;
  is_liked?: boolean;
  parent?: number;
  reply_to_user?: {
    id: number;
    username: string;
  };
};

interface CommentListProps {
  postId: number;
  user: User | null;
  replyTarget?: ReplyTarget | null;
  setReplyTarget: React.Dispatch<React.SetStateAction<ReplyTarget>>;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  onCommentsCountChange?: (count: number) => void;
}

/*
 * Kept outside the component so recursive CommentItem
 * can use the same tree helpers.
 */
const updateCommentTree = (
  list: Comment[],
  id: number,
  updateFn: (comment: Comment) => Comment
): Comment[] => {
  return list.map((item) => {
    if (item.id === id) {
      return updateFn(item);
    }

    if (item.replies?.length) {
      return {
        ...item,
        replies: updateCommentTree(item.replies, id, updateFn),
      };
    }

    return item;
  });
};

const removeCommentFromTree = (
  list: Comment[],
  id: number
): Comment[] => {
  return list
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      replies: item.replies
        ? removeCommentFromTree(item.replies, id)
        : [],
    }));
};

export default function CommentList({
  postId,
  user,
  setReplyTarget,
  comments,
  setComments,
  onCommentsCountChange,
}: CommentListProps) {
  /*
   * React Native primitives are resolved here instead of changing
   * the existing import paths above.
   */
  const {
    Alert,
    Clipboard,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
  } = require("react-native");

  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showReplies, setShowReplies] = useState<
    Record<number, boolean>
  >({});

  const [deleteTarget, setDeleteTarget] =
    useState<number | null>(null);

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  const [editTarget, setEditTarget] =
    useState<number | null>(null);

  const [editText, setEditText] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportTarget, setReportTarget] =
    useState<number | null>(null);

  const scrollViewRef = useRef<any>(null);

  const toggleReplies = (commentId: number) => {
    setShowReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleReport = async () => {
    if (!reportTarget) return;

    if (!reportReason) {
      Alert.alert("Report", "Please select a reason");
      return;
    }

    try {
      const res = await apiRequest(
        `api/comments/${reportTarget}/report/`,
        {
          method: "POST",
          data: {
            reason: reportReason,
            details: reportDetails,
          },
        }
      );

      Alert.alert(
        "Report submitted",
        res?.message || "Your report has been submitted."
      );

      setReportOpen(false);
      setReportTarget(null);
      setReportReason("");
      setReportDetails("");
    } catch (err: any) {
      Alert.alert(
        "Report failed",
        err?.data?.message ||
          "Failed to submit report"
      );
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      /*
       * Supports the old Clipboard implementation if it exists.
       * Otherwise use the native Share API as a fallback.
       */
      if (Clipboard?.setString) {
        Clipboard.setString(text);
        Alert.alert("Copied", "Comment copied to clipboard.");
        return;
      }

      Alert.alert(
        "Copy unavailable",
        "Clipboard access is not available on this device."
      );
    } catch (err) {
      console.error(
        "Failed to copy text",
        err
      );
    }
  };

  const handleEdit = async (commentId: number) => {
    if (!editText.trim()) return;

    try {
      const res = await apiRequest(
        `api/comments/${commentId}/edit/`,
        {
          method: "PATCH",
          data: {
            text: editText.trim(),
          },
        }
      );

      setComments((prev) =>
        updateCommentTree(
          prev,
          commentId,
          (c: Comment) => ({
            ...c,
            text: res.text,
          })
        )
      );

      setEditTarget(null);
      setEditText("");
    } catch (err) {
      console.error("Edit failed", err);
      Alert.alert(
        "Edit failed",
        "Failed to edit comment."
      );
    }
  };

  /*
   * Fetch comments.
   */
  const fetchComments = async (url?: string) => {
    try {
      const safePostId = Number(postId);

      if (!safePostId) return;

      const finalUrl =
        url ||
        `api/comments/?post=${safePostId}`;

      const data = await apiRequest(finalUrl);

      const results = Array.isArray(data)
        ? data
        : data.results || [];

      setComments((prev) => {
        if (url) {
          const existingIds = new Set(
            prev.map((c) => c.id)
          );

          return [
            ...prev,
            ...results.filter(
              (c: Comment) =>
                !existingIds.has(c.id)
            ),
          ];
        }

        const merged = [...results];

        prev.forEach((comment) => {
          const exists =
            merged.some(
              (c: Comment) =>
                c.id === comment.id
            ) ||
            (comment.client_id &&
              merged.some(
                (c: Comment) =>
                  c.client_id ===
                  comment.client_id
              ));

          if (!exists) {
            merged.unshift(comment);
          }
        });

        return merged;
      });

      setNextPage(data.next || null);
    } catch (err) {
      console.error(
        "Failed to fetch comments",
        err
      );
    }
  };

  /*
   * Like comment.
   */
  const handleLike = async (id: number) => {
    try {
      const res = await apiRequest(
        `api/comment-likes/${id}/toggle/`,
        {
          method: "POST",
        }
      );

      setComments((prev) =>
        updateCommentTree(
          prev,
          id,
          (c: Comment) => ({
            ...c,
            likes_count: res.likes_count,
            is_liked: res.liked,
          })
        )
      );
    } catch (err) {
      console.error(
        "Like failed",
        err
      );
    }
  };

  /*
   * Delete comment.
   */
  const handleDeleteComment = async (
    commentId: number
  ) => {
    /*
     * Keep optimistic deletion.
     */
    setComments((prev) =>
      removeCommentFromTree(
        prev,
        commentId
      )
    );

    try {
      await apiRequest(
        `api/comments/${commentId}/`,
        {
          method: "DELETE",
        }
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        "Failed to delete comment",
        err
      );

      /*
       * The original behavior does not restore
       * the comment on failure, so preserve it.
       */
    }
  };

  /*
   * Recursive comment item.
   */
  const CommentItem = ({
    item,
    depth = 0,
  }: {
    item: Comment;
    depth?: number;
  }) => {
    const isOpen =
      showReplies[item.id] ?? false;

    const isLiked =
      item.is_liked ?? false;

    const likesCount =
      item.likes_count ?? 0;

    const isOwner =
      user?.id === item.user?.id;

    const replies =
      item.replies ?? [];

    const nextDepth =
      depth >= 1 ? 1 : depth + 1;

    const menuId =
      `reply-${item.id}-${depth}`;

    return (
      <View
        className={
          depth > 0
            ? "mt-2 ml-6 border-l border-gray-300 pl-3 dark:border-gray-700"
            : "mt-2"
        }
      >
        <View className="flex-row gap-2">
          <Avatar
            username={
              item.user?.username
            }
            avatarUrl={
              item.user?.avatar
            }
            size={
              depth > 0 ? 6 : 8
            }
          />

          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {item.user?.username}
            </Text>

            {item.reply_to_user && (
              <Text className="mb-1 text-xs text-blue-500">
                Replying to @
                {item.reply_to_user.username}
              </Text>
            )}

            {editTarget === item.id ? (
              <View className="mt-2">
                <TextInput
                  value={editText}
                  onChangeText={
                    setEditText
                  }
                  className="rounded border border-gray-300 bg-white p-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  multiline
                  placeholder="Edit comment"
                  placeholderTextColor="#9ca3af"
                />

                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() =>
                      handleEdit(
                        item.id
                      )
                    }
                    className="rounded bg-green-600 px-3 py-2"
                  >
                    <Text className="text-sm font-medium text-white">
                      Save
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setEditTarget(
                        null
                      )
                    }
                    className="px-3 py-2"
                  >
                    <Text className="text-sm text-gray-700 dark:text-gray-200">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text className="text-xs text-gray-600 dark:text-gray-300">
                {item.text}
              </Text>
            )}

            {/* ACTIONS */}
            <View className="mt-1 flex-row items-center gap-4">
              <Pressable
                onPress={() =>
                  handleLike(item.id)
                }
                className="flex-row items-center"
              >
                <ThumbsUp
                  size={14}
                  color={
                    isLiked
                      ? "#2563eb"
                      : "#6b7280"
                  }
                />

                {likesCount > 0 && (
                  <Text
                    className={`ml-1 text-xs ${
                      isLiked
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {formatCount(
                      likesCount
                    )}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() =>
                  setReplyTarget({
                    id: item.id,
                    type: "reply",
                    username:
                      item.user.username,
                  })
                }
              >
                <Text className="text-xs text-gray-500">
                  Reply
                </Text>
              </Pressable>

              <Text className="text-xs text-gray-500">
                {timeAgo(
                  item.created_at
                )}
              </Text>

              <View className="relative">
                <Pressable
                  onPress={() =>
                    setOpenMenuId(
                      (prev) =>
                        prev === menuId
                          ? null
                          : menuId
                    )
                  }
                  className="px-2"
                >
                  <Text className="text-lg leading-4 text-gray-400">
                    ⋮
                  </Text>
                </Pressable>

                {openMenuId ===
                  menuId && (
                  <View className="absolute right-0 top-7 z-50 min-w-[130px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {isOwner ? (
                      <>
                        <Pressable
                          onPress={() => {
                            handleDeleteComment(
                              item.id
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                          className="px-3 py-3"
                        >
                          <Text className="text-red-500">
                            Delete
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            setEditTarget(
                              item.id
                            );
                            setEditText(
                              item.text
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                          className="px-3 py-3"
                        >
                          <Text className="text-gray-700 dark:text-gray-200">
                            Edit
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable
                          onPress={() => {
                            setReportTarget(
                              item.id
                            );
                            setReportOpen(
                              true
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                          className="px-3 py-3"
                        >
                          <Text className="text-gray-700 dark:text-gray-200">
                            Report
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            handleCopyText(
                              item.text
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                          className="px-3 py-3"
                        >
                          <Text className="text-gray-700 dark:text-gray-200">
                            Copy text
                          </Text>
                        </Pressable>
                      </>
                    )}

                    <Pressable
                      onPress={() =>
                        setOpenMenuId(
                          null
                        )
                      }
                      className="px-3 py-3"
                    >
                      <Text className="text-gray-500">
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* VIEW / HIDE REPLIES */}
            {replies.length > 0 && (
              <Pressable
                onPress={() =>
                  toggleReplies(
                    item.id
                  )
                }
                className="mt-1"
              >
                <Text className="text-xs text-gray-500">
                  {isOpen
                    ? "Hide replies"
                    : `View replies (${replies.length})`}
                </Text>
              </Pressable>
            )}

            {isOpen &&
              replies.length > 0 && (
                <View className="mt-2">
                  {replies.map(
                    (
                      child,
                      index
                    ) => (
                      <CommentItem
                        key={`reply-${child.id}-${depth}-${index}`}
                        item={child}
                        depth={
                          nextDepth
                        }
                      />
                    )
                  )}
                </View>
              )}
          </View>
        </View>
      </View>
    );
  };

  /*
   * Comments socket.
   */
  useEffect(() => {
    let ws: WebSocket | null =
      null;

    let cancelled = false;

    const init = async () => {
      try {
        ws =
          await connectCommentsSocket(
            postId
          );

        if (
          !ws ||
          cancelled
        ) {
          return;
        }

        ws.onmessage = (
          event
        ) => {
          try {
            const data =
              JSON.parse(
                event.data
              );

            console.log(
              "foind",
              data
            );

            switch (
              data.type
            ) {
              case "new_comment":
                if (
                  !data.comment
                    .parent
                ) {
                  setComments(
                    (prev) => {
                      const existingById =
                        prev.find(
                          (c) =>
                            c.id ===
                            data
                              .comment
                              .id
                        );

                      if (
                        existingById
                      ) {
                        return prev;
                      }

                      const optimistic =
                        prev.findIndex(
                          (c) =>
                            c.client_id ===
                            data
                              .comment
                              .client_id
                        );

                      if (
                        optimistic !==
                        -1
                      ) {
                        const copy =
                          [
                            ...prev,
                          ];

                        copy[
                          optimistic
                        ] =
                          data.comment;

                        return copy;
                      }

                      return [
                        data.comment,
                        ...prev,
                      ];
                    }
                  );
                } else {
                  const addReply = (
                    list: Comment[]
                  ): Comment[] =>
                    list.map(
                      (c) => {
                        if (
                          c.id ===
                          data
                            .comment
                            .root_parent_id
                        ) {
                          const index =
                            (
                              c.replies ??
                              []
                            ).findIndex(
                              (r) =>
                                r.client_id ===
                                data
                                  .comment
                                  .client_id
                            );

                          if (
                            index !==
                            -1
                          ) {
                            const replies =
                              [
                                ...(c.replies ??
                                  []),
                              ];

                            replies[
                              index
                            ] =
                              data.comment;

                            return {
                              ...c,
                              replies,
                            };
                          }

                          const exists =
                            (
                              c.replies ??
                              []
                            ).some(
                              (r) =>
                                r.id ===
                                data
                                  .comment
                                  .id
                            );

                          if (
                            exists
                          ) {
                            return c;
                          }

                          return {
                            ...c,
                            replies: [
                              ...(c.replies ??
                                []),
                              data.comment,
                            ],
                          };
                        }

                        return {
                          ...c,
                          replies:
                            c.replies
                              ? addReply(
                                  c.replies
                                )
                              : [],
                        };
                      }
                    );

                  setComments(
                    (prev) =>
                      addReply(
                        prev
                      )
                  );
                }

                onCommentsCountChange?.(
                  data.comments_count
                );

                break;

              case "comment_deleted":
                setComments(
                  (prev) =>
                    removeCommentFromTree(
                      prev,
                      data.comment_id
                    )
                );

                onCommentsCountChange?.(
                  data.comments_count
                );

                break;

              case "comment_updated":
                setComments(
                  (prev) =>
                    updateCommentTree(
                      prev,
                      data.comment.id,
                      () =>
                        data.comment
                    )
                );

                break;
            }
          } catch (error) {
            console.error(
              "Invalid comment socket data:",
              error
            );
          }
        };
      } catch (error) {
        console.error(
          "Failed to connect comments socket:",
          error
        );
      }
    };

    init();

    return () => {
      cancelled = true;

      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [postId]);

  /*
   * Initial comments fetch.
   */
  useEffect(() => {
    if (!postId) return;

    setComments([]);
    setNextPage(null);

    fetchComments();
  }, [postId]);

  /*
   * Native replacement for IntersectionObserver.
   *
   * The ScrollView checks when the user is close to
   * the bottom and automatically loads the next page.
   */
  const handleScroll = (
    event: any
  ) => {
    if (
      loadingMore ||
      !nextPage
    ) {
      return;
    }

    const {
      layoutMeasurement,
      contentOffset,
      contentSize,
    } =
      event.nativeEvent;

    const paddingToBottom = 120;

    const isNearBottom =
      layoutMeasurement.height +
        contentOffset.y >=
      contentSize.height -
        paddingToBottom;

    if (isNearBottom) {
      setLoadingMore(true);

      fetchComments(
        nextPage
      ).finally(() => {
        setLoadingMore(false);
      });
    }
  };

  return (
    <View className="relative mt-6 flex-1">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="pb-24"
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={250}
        showsVerticalScrollIndicator={false}
      >
        {comments?.length ===
          0 && (
          <Text className="text-gray-500">
            No comments yet
          </Text>
        )}

        {comments?.map(
          (comment) => {
            const isLiked =
              comment.is_liked ??
              false;

            const likesCount =
              comment.likes_count ??
              0;

            const isOwner =
              user?.id ===
              comment.user?.id;

            const replies =
              comment.replies ??
              [];

            const menuId =
              `comment-${comment.id}`;

            return (
              <View
                key={`comment-${comment.id}`}
                className="mb-4 flex-row gap-2"
              >
                <Avatar
                  username={
                    comment.user
                      ?.username
                  }
                  avatarUrl={
                    comment.user
                      ?.avatar
                  }
                  size={8}
                />

                <View className="flex-1">
                  {/* USERNAME */}
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {
                      comment.user
                        ?.username
                    }
                  </Text>

                  {/* COMMENT TEXT */}
                  {editTarget ===
                  comment.id ? (
                    <View className="mt-2">
                      <TextInput
                        value={
                          editText
                        }
                        onChangeText={
                          setEditText
                        }
                        className="rounded border border-gray-300 bg-white p-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        multiline
                        placeholder="Edit comment"
                        placeholderTextColor="#9ca3af"
                      />

                      <View className="mt-2 flex-row gap-2">
                        <Pressable
                          onPress={() =>
                            handleEdit(
                              comment.id
                            )
                          }
                          className="rounded bg-green-600 px-3 py-2"
                        >
                          <Text className="text-sm text-white">
                            Save
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            setEditTarget(
                              null
                            )
                          }
                          className="px-3 py-2"
                        >
                          <Text className="text-sm text-gray-700 dark:text-gray-200">
                            Cancel
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-xs text-gray-600 dark:text-gray-300">
                      {
                        comment.text
                      }
                    </Text>
                  )}

                  {/* ACTIONS */}
                  <View className="mt-1 flex-row items-center gap-4">
                    {/* LIKE */}
                    <Pressable
                      onPress={() =>
                        handleLike(
                          comment.id
                        )
                      }
                      className="flex-row items-center"
                    >
                      <ThumbsUp
                        size={14}
                        color={
                          isLiked
                            ? "#2563eb"
                            : "#6b7280"
                        }
                      />

                      {likesCount >
                        0 && (
                        <Text
                          className={`ml-1 text-xs ${
                            isLiked
                              ? "text-blue-600"
                              : "text-gray-500"
                          }`}
                        >
                          {formatCount(
                            likesCount
                          )}
                        </Text>
                      )}
                    </Pressable>

                    {/* REPLY */}
                    <Pressable
                      onPress={() =>
                        setReplyTarget(
                          {
                            id: comment.id,
                            type: "comment",
                            username:
                              comment
                                .user
                                .username,
                          }
                        )
                      }
                    >
                      <Text className="text-xs text-gray-500">
                        Reply
                      </Text>
                    </Pressable>

                    <Text className="text-xs text-gray-500">
                      {timeAgo(
                        comment.created_at
                      )}
                    </Text>

                    {/* MENU */}
                    <View className="relative">
                      <Pressable
                        onPress={() =>
                          setOpenMenuId(
                            (prev) =>
                              prev ===
                              menuId
                                ? null
                                : menuId
                          )
                        }
                        className="px-2"
                      >
                        <Text className="text-lg leading-4 text-gray-400">
                          ⋮
                        </Text>
                      </Pressable>

                      {openMenuId ===
                        menuId && (
                        <View className="absolute right-0 top-7 z-50 min-w-[130px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                          {isOwner ? (
                            <>
                              <Pressable
                                onPress={() => {
                                  handleDeleteComment(
                                    comment.id
                                  );
                                  setOpenMenuId(
                                    null
                                  );
                                }}
                                className="px-3 py-3"
                              >
                                <Text className="text-red-500">
                                  Delete
                                </Text>
                              </Pressable>

                              <Pressable
                                onPress={() => {
                                  setEditTarget(
                                    comment.id
                                  );
                                  setEditText(
                                    comment.text
                                  );
                                  setOpenMenuId(
                                    null
                                  );
                                }}
                                className="px-3 py-3"
                              >
                                <Text className="text-gray-700 dark:text-gray-200">
                                  Edit
                                </Text>
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Pressable
                                onPress={() => {
                                  setReportTarget(
                                    comment.id
                                  );
                                  setReportOpen(
                                    true
                                  );
                                  setOpenMenuId(
                                    null
                                  );
                                }}
                                className="px-3 py-3"
                              >
                                <Text className="text-gray-700 dark:text-gray-200">
                                  Report
                                </Text>
                              </Pressable>

                              <Pressable
                                onPress={() => {
                                  handleCopyText(
                                    comment.text
                                  );
                                  setOpenMenuId(
                                    null
                                  );
                                }}
                                className="px-3 py-3"
                              >
                                <Text className="text-gray-700 dark:text-gray-200">
                                  Copy text
                                </Text>
                              </Pressable>
                            </>
                          )}

                          <Pressable
                            onPress={() =>
                              setOpenMenuId(
                                null
                              )
                            }
                            className="px-3 py-3"
                          >
                            <Text className="text-gray-500">
                              Cancel
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* REPLIES */}
                  {replies.length >
                    0 && (
                    <View className="ml-6 mt-2">
                      <Pressable
                        onPress={() =>
                          toggleReplies(
                            comment.id
                          )
                        }
                      >
                        <Text className="text-xs text-gray-500">
                          {showReplies[
                            comment.id
                          ]
                            ? "Hide replies"
                            : `View replies (${replies.length})`}
                        </Text>
                      </Pressable>

                      {showReplies[
                        comment.id
                      ] && (
                        <View className="mt-2">
                          {replies.map(
                            (
                              reply,
                              index
                            ) => (
                              <CommentItem
                                key={`reply-${reply.id}-${index}`}
                                item={
                                  reply
                                }
                                depth={
                                  1
                                }
                              />
                            )
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          }
        )}

        {/* PAGINATION */}
        {nextPage && (
          <View className="h-10 items-center justify-center">
            {loadingMore ? (
              <Text className="text-gray-400">
                Loading...
              </Text>
            ) : (
              <Text className="text-gray-400">
                {" "}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <ReportCommentModal
        open={reportOpen}
        reason={reportReason}
        details={reportDetails}
        setReason={
          setReportReason
        }
        setDetails={
          setReportDetails
        }
        onClose={() => {
          setReportOpen(false);
          setReportReason("");
          setReportDetails("");
          setReportTarget(null);
        }}
        onSubmit={
          handleReport
        }
      />
    </View>
  );
}