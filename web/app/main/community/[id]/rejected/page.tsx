'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import ShareCard from '@/components/share/SharePostCard';
import ModerationBar from '@/components/community/ModerationBar';

import { apiRequest } from '@/utils/api';

type SelectedItem = {
  type: 'post' | 'share';
  id: number;
};

export default function RejectedPostsPage() {
  const params = useParams();
  const communityId = params.id;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPosts, setSelectedPosts] =
    useState<SelectedItem[]>([]);

  const [selectMode, setSelectMode] =
    useState(false);

  const [community, setCommunity] =
    useState<any>({});

  const isAdmin =
    community?.my_role === 'admin';

  const isModerator =
    community?.my_role === 'moderator';

  const isOwner =
    community?.my_role === 'owner';

  const canModerate =
    isOwner ||
    isAdmin ||
    isModerator;

  useEffect(() => {
    fetchCommunity();
    fetchRejectedPosts();
  }, []);

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

  const fetchRejectedPosts = async () => {
    try {
      const data = await apiRequest(
        `api/communities/${communityId}/rejected_posts/`
      );

      setPosts(data.results || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isSelected = (
    type: 'post' | 'share',
    id: number
  ) => {
    return selectedPosts.some(
      item =>
        item.type === type &&
        Number(item.id) === Number(id)
    );
  };

  const toggleSelect = (
    type: 'post' | 'share',
    id: number
  ) => {
    setSelectedPosts(prev => {

      const exists = prev.some(
        item =>
          item.type === type &&
          Number(item.id) === Number(id)
      );

      if (exists) {
        return prev.filter(
          item =>
            !(
              item.type === type &&
              Number(item.id) === Number(id)
            )
        );
      }

      return [
        ...prev,
        {
          type,
          id: Number(id),
        },
      ];
    });
  };

  const enterSelectMode = () => {
    setSelectMode(true);
  };

  const handleBulkDelete = async () => {
    if (!selectedPosts.length) {
      return;
    }

    try {
      await apiRequest(
        `api/communities/bulk_delete/`,
        {
          method: 'POST',
          data: {
            items: selectedPosts,
            community_id: Number(communityId),
          },
        }
      );

      setPosts(prev =>
        prev.filter(post =>
          !selectedPosts.some(
            selected =>
              selected.type === post.type &&
              Number(selected.id) ===
                Number(post.id)
          )
        )
      );

      setSelectedPosts([]);
      setSelectMode(false);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl my-14 mx-auto py-4">

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-gray-200 dark:bg-gray-950 border-b p-4">

        <div className="flex items-center justify-between gap-3">

          <div>
            <h1 className="text-2xl text-gray-700 dark:text-gray-300 font-bold">
              Rejected Posts
            </h1>

            <p className="text-sm text-gray-500">
              {canModerate
                ? 'All rejected posts in this community.'
                : 'Your rejected posts only.'}
            </p>
          </div>

          {/* SELECT */}
          {canModerate &&
            !selectMode &&
            posts.length > 0 && (

            <button
              type="button"
              onClick={enterSelectMode}
              className="
                px-4
                py-2
                rounded-lg
                bg-gray-900
                dark:bg-white
                text-white
                dark:text-black
                text-sm
                font-medium
                hover:opacity-80
              "
            >
              Select
            </button>
          )}

          {/* CANCEL */}
          {selectMode && (
            <button
              type="button"
              onClick={() => {
                setSelectMode(false);
                setSelectedPosts([]);
              }}
              className="
                px-4
                py-2
                rounded-lg
                bg-gray-200
                dark:bg-gray-800
                text-gray-700
                dark:text-gray-200
                text-sm
                font-medium
              "
            >
              Cancel
            </button>
          )}

        </div>

        {/* SELECTION COUNT */}
        {selectMode && (
          <div className="mt-3 text-sm text-gray-500">
            {selectedPosts.length > 0
              ? `${selectedPosts.length} selected`
              : 'Tap posts to select them'}
          </div>
        )}

      </div>

      {/* LOADING */}
      {loading && (
        <div className="py-10 text-center text-gray-500">
          Loading...
        </div>
      )}

      {/* EMPTY */}
      {!loading &&
        posts.length === 0 && (
        <div className="py-20 text-center text-gray-500">
          No rejected posts found.
        </div>
      )}

      {/* POSTS */}
      <div className="space-y-4">

        {posts.map((post) => {

          const type =
            post.type === 'share'
              ? 'share'
              : 'post';

          const selected =
            isSelected(
              type,
              Number(post.id)
            );

          return (
            <div
              key={`${post.type}-${post.id}`}
              className="relative"
            >

              {/* SHARE */}
              {post.type === 'share' ? (

                <div
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(
                        'share',
                        Number(post.id)
                      );
                    }
                  }}
                  className={
                    selectMode
                      ? 'cursor-pointer'
                      : ''
                  }
                >

                  <ShareCard
                    share={post}
                    currentUser={null}
                    hideStarButton={true}
                    canModerateShares={
                      canModerate
                    }
                    canReport={false}
                  />

                </div>

              ) : post.content_type === 'short_video' ? (

                /* REEL */
                <ReelCard
                  post={post}

                  hideCommunityName

                  showManageButtons={
                    canModerate
                  }

                  canDelete={true}
                  canEdit={false}
                  canRepost={false}

                  canBulkSelect={
                    selectMode
                  }

                  isSelected={
                    selected
                  }

                  onSelect={() =>
                    toggleSelect(
                      'post',
                      Number(post.id)
                    )
                  }

                  onLongPress={() => {
                    setSelectMode(true);

                    toggleSelect(
                      'post',
                      Number(post.id)
                    );
                  }}

                  setSelectMode={
                    setSelectMode
                  }

                  onDelete={(id: number) => {

                    setPosts(prev =>
                      prev.filter(
                        p =>
                          Number(p.id) !==
                          Number(id)
                      )
                    );

                    setSelectedPosts(prev =>
                      prev.filter(
                        selectedItem =>
                          !(
                            selectedItem.type ===
                              'post' &&
                            Number(
                              selectedItem.id
                            ) ===
                              Number(id)
                          )
                      )
                    );
                  }}
                />

              ) : (

                /* NORMAL POST */
                <PostCard
                  post={post}

                  hideCommunityName
                  hideStarButton

                  showPinnedLabel={false}

                  showManageButtons={
                    canModerate
                  }

                  canDelete={true}
                  canEdit={false}
                  canRepost={false}

                  canBulkSelect={
                    selectMode
                  }

                  isSelected={
                    selected
                  }

                  onSelect={() =>
                    toggleSelect(
                      'post',
                      Number(post.id)
                    )
                  }

                  onLongPress={() => {
                    setSelectMode(true);

                    toggleSelect(
                      'post',
                      Number(post.id)
                    );
                  }}

                  setSelectMode={
                    setSelectMode
                  }

                  onDelete={(id: number) => {

                    setPosts(prev =>
                      prev.filter(
                        p =>
                          Number(p.id) !==
                          Number(id)
                      )
                    );

                    setSelectedPosts(prev =>
                      prev.filter(
                        selectedItem =>
                          !(
                            selectedItem.type ===
                              'post' &&
                            Number(
                              selectedItem.id
                            ) ===
                              Number(id)
                          )
                      )
                    );
                  }}
                />

              )}

              {/* VISIBLE SELECT CONTROL */}
              {selectMode && canModerate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();

                    toggleSelect(
                      type,
                      Number(post.id)
                    );
                  }}
                  className={`
                    absolute
                    top-3
                    right-3
                    z-20
                    w-9
                    h-9
                    rounded-full
                    flex
                    items-center
                    justify-center
                    text-white
                    font-bold
                    shadow-lg
                    ${
                      selected
                        ? 'bg-green-500'
                        : 'bg-gray-500'
                    }
                  `}
                >
                  {selected ? '✓' : ''}
                </button>
              )}

            </div>
          );
        })}

      </div>

      {/* BULK ACTION BAR */}
      {selectMode &&
        selectedPosts.length > 0 && (

        <ModerationBar
          selectedCount={
            selectedPosts.length
          }

          onDelete={
            handleBulkDelete
          }

          onCancel={() => {
            setSelectMode(false);
            setSelectedPosts([]);
          }}
        />

      )}

    </div>
  );
}