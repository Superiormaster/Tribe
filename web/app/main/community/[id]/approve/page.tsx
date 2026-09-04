'use client';

import {
  useEffect,
  useState,
  useContext,
  useCallback,
} from 'react';

import { useParams } from 'next/navigation';

import PostCard from '@/components/PostCard';
import RepostCard from '@/components/repost/RepostCard';
import ReelCard from '@/components/ReelCard';
import ShareCard from '@/components/share/SharePostCard';

import { apiRequest } from '@/utils/api';
import { UserContext } from "@/components/UserContext";

type FeedItem = {
  type: "post" | "share" | "repost";
  id: number;
  [key: string]: any;
};

type SelectedItem = {
  type: "post" | "share" | "repost";
  id: number;
};

export default function ApprovedPostsPage() {

  const params = useParams();
  const communityId = params.id;

  const {
    user: currentUser
  } = useContext(UserContext)!;

  const [posts, setPosts] =
    useState<FeedItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [community, setCommunity] =
    useState<any>({});

  const [nextUrl, setNextUrl] =
    useState<string | null>(null);

  const [selectedPosts, setSelectedPosts] =
    useState<SelectedItem[]>([]);

  const [selectMode, setSelectMode] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const isAdmin =
    community?.my_role === "admin";
  const isModerator =
    community?.my_role === "moderator";
  const isOwner =
    community?.my_role === "owner";

  const canModerate =
    isOwner ||
    isAdmin ||
    isModerator;

  const fetchCommunity = async () => {

    try {
      const data = await apiRequest(
        `api/communities/${communityId}/`
      );

      setCommunity(data);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovedPosts =
    useCallback(
      async () => {

        try {

          setLoading(true);

          const data =
            await apiRequest(
              `api/communities/${communityId}/approved_posts/`
            );

          const results =
            data.results || [];

          setPosts(results);

          setNextUrl(
            data.next || null
          );

        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      [communityId]
    );

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
        await apiRequest(
          nextUrl
        );

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
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCommunity();
    fetchApprovedPosts();
  }, [
    fetchApprovedPosts
  ]);

  const isSelected = (
    type: FeedItem["type"],
    id: number
  ) => {

    return selectedPosts.some(
      item =>
        item.type === type &&
        Number(item.id) === Number(id)
    );
  };

  const toggleSelect = (
    item: FeedItem | SelectedItem
  ) => {

    const selection: SelectedItem = {
      type: item.type,
      id: Number(item.id),
    };

    setSelectedPosts(prev => {
      const exists = prev.some(
        selected =>
          selected.type === selection.type &&
          Number(selected.id) ===
            Number(selection.id)
      );

      if (exists) {
        return prev.filter(
          selected =>
            !(
              selected.type === selection.type &&
              Number(selected.id) ===
                Number(selection.id)
            )
        );
      }

      return [
        ...prev,
        selection,
      ];
    });
  };

  const selectAll = () => {
    if (
      selectedPosts.length ===
      posts.length
    ) {
      setSelectedPosts([]);
      return;
    }

    const allItems: SelectedItem[] =
      posts.map(item => ({
        type: item.type,
        id: Number(item.id),
      }));

    setSelectedPosts(
      allItems
    );
  };

  const clearSelection = () => {
    setSelectedPosts([]);
    setSelectMode(false);
  };

  const handleBulkDelete = async () => {

    if (
      !selectedPosts.length ||
      deleting
    ) {
      return;
    }

    try {

      setDeleting(true);

      await apiRequest(
        `api/post/bulk-delete/`,
        {
          method: "POST",
          data: {
            community_id:
              Number(communityId),
            items:
              selectedPosts,
          },
        }
      );

      setPosts(prev =>
        prev.filter(item =>
          !selectedPosts.some(
            selected =>
              selected.type === item.type &&
              Number(selected.id) ===
                Number(item.id)
          )
        )
      );


      setSelectedPosts([]);
      setSelectMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (

    <div className="
      max-w-3xl
      mt-14
      mx-auto
      py-4
      pb-24
    ">

      <div className="
        sticky
        top-0
        z-20
        bg-gray-200
        dark:bg-gray-950
        border-b
        p-4
      ">

        <div className="
          flex
          items-center
          justify-between
          gap-3
        ">

          <div>
            <h1 className="
              text-2xl
              text-gray-700
              dark:text-gray-200
              font-bold
            ">
              Approved Posts
            </h1>

            <p className="
              text-sm
              text-gray-500
            ">
              View approved content in this community.
            </p>
          </div>
  
          {/* SELECT BUTTON */}
          {canModerate && (
            <button
              type="button"
              onClick={() => {
                if (selectMode) {
                  clearSelection();
                } else {
                  setSelectMode(true);
                }
              }}
              className="
                px-4
                py-2
                rounded-lg
                bg-blue-600
                hover:bg-blue-700
                text-white
                text-sm
                font-semibold
              "
            >
              {selectMode
                ? "Cancel"
                : "Select"}
            </button>
          )}
        </div>


        {/* SELECT ALL */}
        {selectMode && canModerate && (

          <div className="
            flex
            items-center
            justify-between
            mt-3
          ">

            <span className="
              text-sm
              text-gray-500
            ">
              {selectedPosts.length} selected
            </span>

            <button
              type="button"
              onClick={selectAll}
              className="
                text-sm
                font-medium
                text-blue-600
              "
            >
              {selectedPosts.length === posts.length
                ? "Clear all"
                : "Select all"}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="
          py-10
          text-center
          text-gray-500
        ">
          Loading...
        </div>
      )}

      {!loading &&
        posts.length === 0 && (
        <div className="
          py-20
          text-center
          text-gray-500
        ">
          No approved posts found.
        </div>
      )}

      <div className="space-y-4 px-1 mt-3">
        {posts.map((item) => {

          const selected =
            isSelected(
              item.type,
              item.id
            );


          return (

            <div
              key={`${item.type}-${item.id}`}
              className={`
                relative
                w-full
                max-w-full
                overflow-hidden
                ${
                  selectMode && selected
                    ? "ring-2 ring-blue-500 rounded-xl"
                    : ""
                }
              `}
            >

              {selectMode && canModerate && (

                <button
                  type="button"
                  onClick={(e) => {

                    e.preventDefault();
                    e.stopPropagation();

                    toggleSelect(item);

                  }}
                  className="
                    absolute
                    top-3
                    right-3
                    z-30
                    w-9
                    h-9
                    rounded-full
                    bg-white
                    dark:bg-gray-900
                    border
                    border-gray-300
                    shadow-md
                    flex
                    items-center
                    justify-center
                  "
                >

                  {selected ? (

                    <span className="
                      w-6
                      h-6
                      rounded-full
                      bg-blue-600
                      text-white
                      flex
                      items-center
                      justify-center
                      text-sm
                    ">
                      ✓
                    </span>

                  ) : (

                    <span className="
                      w-6
                      h-6
                      rounded-full
                      border
                      border-gray-400"
                    />

                  )}

                </button>

              )}

              {item.type === "share" ? (

                <div
                  onClick={() => {

                    if (selectMode) {
                      toggleSelect(item);
                    }

                  }}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >

                  <ShareCard
                    share={item}
                    currentUser={
                      currentUser
                    }
                    starredUserIds={
                      new Set()
                    }
                    hideStarButton

                    canBulkSelect={
                      selectMode
                    }

                    isSelected={
                      selected
                    }

                    onSelect={() =>
                      toggleSelect(item)
                    }

                    onLongPress={() => {

                      setSelectMode(true);

                      toggleSelect(item);

                    }}

                    setSelectMode={
                      setSelectMode
                    }
                  />

                </div>


              ) : item.type === "repost" ? (

                <div
                  onClick={() => {

                    if (selectMode) {
                      toggleSelect(item);
                    }

                  }}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >

                  
                  <RepostCard
                    repost={item}
                    currentUser={currentUser}
                    hideStarButton
                    canModerateReposts={canModerate}
                  />

                </div>


              ) : item.content_type === "short_video" ? (

                <div
                  onClick={() => {

                    if (selectMode) {
                      toggleSelect(item);
                    }

                  }}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >

                  <ReelCard
                    post={item}

                    hideCommunityName

                    showManageButtons={
                      canModerate
                    }

                    canDelete={
                      canModerate
                    }

                    canEdit={false}
                    canRepost={false}

                    canBulkSelect={
                      selectMode
                    }

                    isSelected={
                      selected
                    }

                    onSelect={() =>
                      toggleSelect(item)
                    }

                    onLongPress={() => {

                      setSelectMode(true);

                      toggleSelect(item);

                    }}

                    setSelectMode={
                      setSelectMode
                    }

                    onDelete={(id: number) => {

                      setPosts(prev =>
                        prev.filter(
                          post =>
                            !(
                              post.type === "post" &&
                              Number(post.id) ===
                                Number(id)
                            )
                        )
                      );

                    }}

                  />

                </div>


              ) : (

                <div
                  onClick={() => {

                    if (selectMode) {
                      toggleSelect(item);
                    }

                  }}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >

                  <PostCard
                    post={item as any}

                    hideCommunityName
                    hideStarButton
                    showPinnedLabel={false}

                    showManageButtons={
                      canModerate
                    }

                    canDelete={
                      canModerate ||
                      Number(item.user?.id) ===
                        Number(currentUser?.id)
                    }

                    canEdit={
                      canModerate ||
                      Number(item.user?.id) ===
                        Number(currentUser?.id)
                    }

                    canRepost={
                      canModerate ||
                      Number(item.user?.id) ===
                        Number(currentUser?.id)
                    }

                    canBulkSelect={
                      selectMode
                    }

                    isSelected={
                      selected
                    }

                    onSelect={() =>
                      toggleSelect(item)
                    }

                    onLongPress={() => {

                      setSelectMode(true);

                      toggleSelect(item);

                    }}

                    setSelectMode={
                      setSelectMode
                    }

                    onDelete={(id: number) => {

                      setPosts(prev =>
                        prev.filter(
                          post =>
                            !(
                              post.type === "post" &&
                              Number(post.id) ===
                                Number(id)
                            )
                        )
                      );

                    }}

                  />

                </div>

              )}

            </div>

          );

        })}

      </div>

      {nextUrl && (

        <div className="
          py-6
          text-center
        ">

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
            "
          >

            {loadingMore
              ? "Loading..."
              : "Load more"}

          </button>

        </div>

      )}


      {!nextUrl &&
        posts.length > 0 && (

        <div className="
          py-6
          text-center
          text-sm
          text-gray-500
        ">
          You've reached the end.
        </div>

      )}

      {selectMode &&
        canModerate &&
        selectedPosts.length > 0 && (

        <div className="
          fixed
          bottom-0
          left-0
          right-0
          z-50
          bg-white
          dark:bg-gray-950
          border-t
          border-gray-200
          dark:border-gray-800
          shadow-xl
          px-4
          py-3
        ">

          <div className="
            max-w-3xl
            mx-auto
            flex
            items-center
            justify-between
            gap-3
          ">

            <div>

              <p className="
                font-semibold
                text-gray-900
                dark:text-white
              ">
                {selectedPosts.length} selected
              </p>

              <p className="
                text-xs
                text-gray-500
              ">
                Post, repost or share
              </p>

            </div>


            <button
              type="button"
              disabled={deleting}
              onClick={handleBulkDelete}
              className="
                px-5
                py-2
                rounded-lg
                bg-red-600
                hover:bg-red-700
                disabled:opacity-50
                text-white
                text-sm
                font-semibold
              "
            >
              {deleting
                ? "Deleting..."
                : "Delete selected"}
            </button>

          </div>

        </div>

      )}

    </div>
  );
}