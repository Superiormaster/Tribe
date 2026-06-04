'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from '@/utils/api';
import PostCard from '@/components/PostCard';
import Skeleton from '@/components/Skeleton';

export default function RepostPage() {
  const { postId } = useParams();
  const { push } = useNavigation()

  const [post, setPost] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      const res = await apiRequest(`api/post/${postId}/`);
      setPost(res);
    };

    fetchPost();
  }, [postId]);

  const handleRepost = async () => {
    await apiRequest(`api/post/${postId}/repost/`, {
      method: 'POST',
      data: {
        type: 'quote',
        quote_text: text
      }
    });

    push('/main/home');
  };

  if (!post) return <Skeleton />;

  return (
    <div className="pt-4 space-y-4">

      {/* INPUT */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write something..."
        className="w-full text-gray-700 dark:text-gray-200 bg-gray-300 dark:bg-gray-800 border p-2 rounded-md"
        rows={5}
      />

      {/* ORIGINAL POST PREVIEW */}
      <PostCard post={post} hideStarButton={true} showJoinButton={false} canRepost={false} />

      <button
        onClick={handleRepost}
        className="bg-indigo-600 mx-2 text-white px-4 py-2 rounded-md"
      >
        Repost
      </button>

    </div>
  );
}