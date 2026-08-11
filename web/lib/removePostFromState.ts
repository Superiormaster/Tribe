// lib/removePostFromState.ts

export function removePostFromState(
  posts: any[],
  deletedPostId: number
) {
  const id = Number(deletedPostId);

  return posts.filter((post: any) => {
    if (!post) return false;

    // Normal post
    if (Number(post.id) === id) {
      return false;
    }

    // Repost containing deleted post
    if (
      post.type === "repost" ||
      post.feed_type === "repost"
    ) {
      const originalId = Number(
        post.post?.id ??
        post.post_id ??
        post.data?.post?.id ??
        post.original_post_id
      );

      if (originalId === id) {
        return false;
      }
    }

    return true;
  });
}