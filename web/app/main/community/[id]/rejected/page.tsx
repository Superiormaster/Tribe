'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import ModerationBar from '@/components/community/ModerationBar';

import { apiRequest } from '@/utils/api';

export default function RejectedPostsPage() {

  const params = useParams();
  const communityId = params.id;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);

  const [community, setCommunity] = useState<any>({});

  const isAdmin = community?.my_role === 'admin';
  const isModerator = community?.my_role === 'moderator';
  const isOwner =
  community?.my_role === "owner";

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

  const toggleSelect = (id: number) => {

    setSelectedPosts((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );

  };

  const handleBulkDelete = async () => {

    try {

      await apiRequest(
        `api/communities/bulk_delete/`,
        {
          method: 'POST',
          data: {
            post_ids: selectedPosts,
          },
        }
      );

      setPosts((prev) =>
        prev.filter(
          (p) => !selectedPosts.includes(p.id)
        )
      );

      setSelectedPosts([]);
      setSelectMode(false);

    } catch (err) {

      console.error(err);

    }
  };

  return (
    <div className="max-w-3xl my-20 mx-auto py-4">

      <div className="sticky top-0 z-20 bg-white dark:bg-black border-b p-4">

        <h1 className="text-2xl text-gray-700 dark:text-gray-300 font-bold">
          Rejected Posts
        </h1>

        <p className="text-sm text-gray-500">

          {canModerate
            ? 'All rejected posts in this community.'
            : 'Your rejected posts only.'}

        </p>

      </div>

      {loading && (
        <div className="py-10 text-center text-gray-500">
          Loading...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="py-20 text-center text-gray-500">
          No rejected posts found.
        </div>
      )}

      {posts.map((post) => (
        <div
          key={post.id}
          className="relative"
        >
      
          {post.content_type === "short_video" ? (
      
            <ReelCard
              post={post}
      
              hideCommunityName
      
              showManageButtons={canModerate}
      
              canDelete={true}
              canEdit={false}
              canRepost={false}
      
              canBulkSelect={selectMode}
              isSelected={selectedPosts.includes(post.id)}
      
              onSelect={toggleSelect}
              onLongPress={() => {
                setSelectMode(true);
                toggleSelect(post.id);
              }}
              setSelectMode={setSelectMode}
      
              onDelete={(id: number) => {
                setPosts(prev =>
                  prev.filter(p => p.id !== id)
                );
              }}
            />
      
          ) : (

            <PostCard
              post={post}
      
              hideCommunityName
      
              showManageButtons={canModerate}
      
              canDelete={true}
              canEdit={false}
              canRepost={false}
      
              canBulkSelect={selectMode}
              isSelected={selectedPosts.includes(post.id)}
      
              onSelect={toggleSelect}
              onLongPress={() => {
                setSelectMode(true);
                toggleSelect(post.id);
              }}
              hideStarButton={true}
              setSelectMode={setSelectMode}
      
              onDelete={(id: number) => {
                setPosts(prev =>
                  prev.filter(p => p.id !== id)
                );
              }}
            />
      
          )}
      
        </div>
      ))}

      {selectMode && selectedPosts.length > 0 && (
        <ModerationBar
          selectedCount={selectedPosts.length}
          onDelete={handleBulkDelete}
          onCancel={() => {
            setSelectMode(false);
            setSelectedPosts([]);
          }}
        />
      )}

    </div>
  );
}