'use client';

import {
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useNavigation } from "@/utils/useNavigation"
import PostCard from '@/components/PostCard';
import RepostCard from '@/components/repost/RepostCard';
import ReelCard from '@/components/ReelCard';
import ShareCard from '@/components/share/SharePostCard';
import { Bookmark } from 'lucide-react';

import { apiRequest } from '@/utils/api';

type FeedItem = {
  id: number;
  type: "post" | "reel" | "share" | "repost";
  post?: any;
  repost?: any;
  share?: any;
  created_at?: string;
};

export default function BookmarksPage() {

  const { push } = useNavigation()

  const [posts, setPosts] =
    useState<FeedItem[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [nextUrl, setNextUrl] =
    useState<string | null>(null);
  
  const fetchBookmarks =
    useCallback(async () => {

      try {
        setLoading(true);

        const data = await apiRequest(
          'api/bookmarks/'
        );

        const results =
          data.results || [];

        setPosts(results);
        setNextUrl(
          data.next || null
        );

      } catch (err) {
        console.error(
          'Failed to fetch bookmarks:',
          err
        );
      } finally {
        setLoading(false);
      }
    }, []);

  const loadMore = async () => {
    if (
      !nextUrl ||
      loadingMore
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      const data =
        await apiRequest(nextUrl);

      const results =
        data.results || [];

      setPosts(prev => [
        ...prev,
        ...results,
      ]);
      setNextUrl(
        data.next || null
      );

    } catch (err) {
      console.error(
        'Failed to load more bookmarks:',
        err
      );
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const removeBookmark = (bookmarkId: number) => {
    setPosts(prev =>
      prev.filter(
        item => Number(item.id) !== Number(bookmarkId)
      )
    );
  };

  return (
    <div
      className="
        max-w-3xl
        mt-14
        mx-auto
        py-4
        pb-24
      "
    >
      {/* HEADER */}

      <div
        className="
          sticky
          top-0
          z-20
          bg-gray-200
          dark:bg-gray-950
          border-b
          p-4
        "
      >
        <h1
          className="
            text-2xl
            text-gray-700
            dark:text-gray-200
            font-bold
          "
        >
          Bookmarks
        </h1>

        <p
          className="
            text-sm
            text-gray-500
            mt-1
          "
        >
          Posts you've saved for later.
        </p>
      </div>


      {/* LOADING */}

      {loading && (
        <div
          className="
            py-10
            text-center
            text-gray-500
          "
        >
          Loading bookmarks...
        </div>
      )}

      {/* EMPTY */}
      {!loading &&
        posts.length === 0 && (

        <div
          className="
            py-20
            text-center
            text-gray-500
          "
        >
          <div className="text-4xl mb-3">
            <Bookmark />
          </div>

          <h2
            className="
              text-lg
              font-semibold
              text-gray-700
              dark:text-gray-200
            "
          >
            No bookmarks yet
          </h2>

          <p className="text-sm mt-1">
            Posts you bookmark will appear here.
          </p>
        </div>
      )}

      {/* BOOKMARKED CONTENT */}
      <div
        className="
          space-y-4
          px-1
          mt-3
        "
      >

        {posts.map((item) => {

          if (item.type === "share") {
            const share = item.share;
        
            if (!share) return null;
        
            return (
              <div
                key={`share-${item.id}`}
                className="
                  relative
                  w-full
                  max-w-full
                  overflow-hidden
                "
              >
                <ShareCard
                  share={share}
                  currentUser={undefined}
                  starredUserIds={new Set()}
                  hideStarButton
                />
              </div>
            );
          }
        
          if (item.type === "repost") {
            const repost = item.repost;
        
            if (!repost) return null;
        
            return (
              <div
                key={`repost-${item.id}`}
                className="
                  relative
                  w-full
                  max-w-full
                  overflow-hidden
                "
              >
                <RepostCard
                  repost={repost}
                  currentUser={undefined}
                  hideStarButton
                  canReport={false}
                />
              </div>
            );
          }
        
          const post = item.post;
        
          if (!post) return null;
        
          if (post.content_type === "short_video") {
            return (
              <div
                key={`reel-${item.id}`}
                className="
                  relative
                  w-full
                  max-w-full
                  overflow-hidden
                "
              >
                <ReelCard
                  post={post}
                  hideCommunityName
                  hideStarButton
                  canEdit={false}
                  canDelete={false}
                  canRepost={false}
                />
              </div>
            );
          }
        
          return (
            <div
              key={`post-${item.id}`}
              className="
                relative
                w-full
                max-w-full
                overflow-hidden
              "
            >
              <PostCard
                post={post}
                hideCommunityName
                hideStarButton
                canEdit={false}
                showPinnedLabel={false}
                canDelete={false}
                canRepost={false}
                setPosts={setPosts}
                onBookmarkRemoved={() => {
                  removeBookmark(item.id);
                }}
                onDelete={() => {
                  removeBookmark(item.id);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* LOAD MORE */}
      {nextUrl && (
        <div
          className="
            py-6
            text-center
          "
        >

          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="
              px-5
              py-2
              rounded-xl
              bg-gray-200
              dark:bg-gray-800
              text-sm
              disabled:opacity-50
            "
          >

            {loadingMore
              ? "Loading..."
              : "Load more"}

          </button>
        </div>
      )}

      {/* END */}
      {!nextUrl &&
        posts.length > 0 && (
        <div
          className="
            py-6
            text-center
            text-sm
            text-gray-500
          "
        >
          You've reached the end.
        </div>
      )}
    </div>
  );
}