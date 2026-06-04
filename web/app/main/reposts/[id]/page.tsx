'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

import Avatar from '@/components/Avatar'
import Skeleton from '@/components/Skeleton'
import CommentList from '@/components/CommentList'
import CommentInput from '@/components/CommentInput'
import ShareButton from '@/components/ShareButton'

import { apiRequest } from '@/utils/api'
import { timeAgo } from '@/utils/timeAgo'

import {
  AlarmClock,
  Repeat,
  ThumbsUp,
  MessageCircle,
  ChartNoAxesColumn
} from 'lucide-react'

export default function RepostDetailPage() {
  const params = useParams()
  const repostId = Number(params.id)

  const [repost, setRepost] = useState<any>(null)
  const [comments, setComments] = useState([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)

  const [replyTarget, setReplyTarget] = useState({
    id: null,
    type: null,
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    fetchRepost()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const user = await apiRequest('api/users/me/')
      setCurrentUser(user)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchRepost = async () => {
    try {
      const data = await apiRequest(
        `api/reposts/${repostId}/`
      )

      setRepost(data)

      setLiked(data.post?.liked_by_user || false)
      setLikes(data.post?.likes_count || 0)

    } catch (err) {
      console.error(err)
    }
  }

  const handleLike = async () => {
    if (!repost?.post?.id) return

    try {
      const result = await apiRequest(
        `api/likes/${repost.post.id}/toggle/`,
        {
          method: 'POST'
        }
      )

      setLiked(result.liked)
      setLikes(result.likes_count)

    } catch (err) {
      console.error(err)
    }
  }

  if (!repost) {
    return (
      <div className="mt-10">
        <Skeleton />
      </div>
    )
  }

  const post = repost.post

  return (
    <div className="max-w-3xl mx-auto pb-28">

      {/* REPOST HEADER */}
      <div className="flex items-center gap-2 px-4 py-3 text-gray-500">

        <Repeat className="w-4 h-4" />

        <span className="font-medium">
          {repost.user.username} reposted
        </span>

        <span className="ml-auto flex items-center text-sm">
          <AlarmClock className="mr-1 w-4 h-4" />
          {timeAgo(repost.created_at)}
        </span>

      </div>

      {/* QUOTE TEXT */}
      {repost.repost_type === 'quote' &&
        repost.quote_text && (
          <div className="px-4 mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-line">
            {repost.quote_text}
          </div>
      )}

      {/* ORIGINAL POST */}
      <div className="px-4">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">

          <Avatar
            username={post.user.username}
            avatarUrl={post.user.avatar}
            size={12}
          />

          <div className="flex flex-col">

            <span className="font-bold text-gray-700 dark:text-gray-100">
              {post.user.username}
            </span>

            {post.community_name && (
              <span className="text-sm text-gray-500">
                in {post.community_name}
              </span>
            )}

          </div>

        </div>

        {/* CAPTION */}
        {post.caption && (
          <p className="mb-4 whitespace-pre-line text-gray-700 dark:text-gray-300">
            {post.caption}
          </p>
        )}

        {/* MEDIA */}
        {post.media_files?.length > 0 && (
          <div className="flex flex-col gap-4">

            {post.media_files.map((media, index) => (
              <div
                key={index}
                className="rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700"
              >

                {media.media_type === 'image' ? (
                  <img
                    src={media.file_url}
                    alt=""
                    className="w-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={media.file_url}
                    controls
                    autoPlay
                    className="w-full aspect-video object-cover"
                  />
                )}

              </div>
            ))}

          </div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center gap-6 my-6">

          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-gray-500 font-medium ${
              liked ? 'text-blue-600' : ''
            }`}
          >
            <ThumbsUp className="mr-2" />

            {likes > 0 && (
              <span>{likes}</span>
            )}
          </button>

          <button className="flex items-center gap-1 text-gray-500 font-medium">
            <MessageCircle className="mr-2" />

            {post.comments_count > 0 && (
              <span>{post.comments_count}</span>
            )}
          </button>

          <ShareButton post={post} />

          {post.views_count !== undefined && (
            <span className="ml-auto flex items-center text-gray-400">

              <ChartNoAxesColumn className="mr-2" />

              {post.views_count} views

            </span>
          )}

        </div>

        {/* COMMENTS */}
        <CommentList
          user={currentUser}
          postId={post.id}
          setReplyTarget={setReplyTarget}
          comments={comments}
          setComments={setComments}
        />

      </div>

      {/* INPUT */}
      <div className="fixed bottom-0 left-0 w-full border-t bg-white dark:bg-gray-900 z-50">

        <div className="max-w-3xl mx-auto p-3">

          <CommentInput
            postId={post.id}
            replyTarget={replyTarget}
            onClearReply={() =>
              setReplyTarget({
                id: null,
                type: null,
              })
            }
            onNewComment={(newComment) =>
              setComments(prev => [
                newComment,
                ...prev
              ])
            }
          />

        </div>

      </div>

    </div>
  )
}