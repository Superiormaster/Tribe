'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Avatar from '@/components/Avatar'
import Skeleton from '@/components/Skeleton'
import CommentList from '@/components/CommentList'
import Linkify from 'linkify-react'
import CommentInput from '@/components/CommentInput'
import ShareButton from '@/components/share/ShareButton'
import { useShareSheet } from '@/components/share/ShareContext'
import { usePostSocket } from '@/hooks/usePostSocket'
import toast from "react-hot-toast";
import { apiRequest } from '@/utils/api'
import { timeAgo } from '@/utils/timeAgo'

import {
  AlarmClock,
  Share2,
  ThumbsUp,
  MessageCircle,
  ChartNoAxesColumn,
  Bookmark,
} from 'lucide-react'

type ReplyTarget = {
  id: number | null
  type: "reply" | "comment" | null
  username?: string
}

export default function ShareDetailPage() {

  const params = useParams()
  const shareId = Number(params.id)

  const [share, setShare] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  const { showShare } = useShareSheet()

  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)

  const [replyTarget, setReplyTarget] =
    useState<ReplyTarget>({
      id: null,
      type: null,
    })

  const videoRef =
    useRef<HTMLVideoElement | null>(null)

  const onReplaceComment = (
    clientId: string,
    comment: any
  ) => {

    setComments(prev =>
      prev.map(c =>
        c?.client_id === clientId
          ? comment
          : c
      )
    )
  }

  const onRemoveComment = (
    clientId: string
  ) => {

    setComments(prev =>
      prev.filter(
        c => c?.client_id !== clientId
      )
    )
  }
  
  usePostSocket({

    postId: share?.post?.id ?? 0,

    onStats: (data) => {

      setShare((prev: any) =>
        prev
          ? {
              ...prev,

              post: {
                ...prev.post,
                likes_count:
                  data.likes_count,

                comments_count:
                  data.comments_count,

                shares_count:
                  data.shares_count,

                views_count:
                  data.views_count,
              },
            }
          : prev
      )

      setLikes(data.likes_count)
    },

    onNewComment: (data) => {

      setShare((prev: any) =>
        prev
          ? {
              ...prev,

              post: {
                ...prev.post,

                comments_count:
                  data.comments_count,
              },
            }
          : prev
      )

      const newComment = data.comment

      if (!newComment) return

      setComments(prev => {

        const exists = prev.some(
          comment =>
            Number(comment.id) ===
            Number(newComment.id)
        )

        if (exists) return prev

        if (!newComment.parent) {
          return [
            newComment,
            ...prev,
          ]
        }

        const addReply = (
          list: any[]
        ): any[] =>

          list.map(comment => {

            if (
              Number(comment.id) ===
              Number(
                newComment.root_parent_id
              )
            ) {

              return {
                ...comment,

                replies: [
                  ...(comment.replies ?? []),
                  newComment,
                ],
              }
            }

            return {
              ...comment,

              replies: comment.replies
                ? addReply(comment.replies)
                : [],
            }
          })

        return addReply(prev)
      })
    },

    onCommentDeleted: (data) => {

      setShare((prev: any) =>
        prev
          ? {
              ...prev,

              post: {
                ...prev.post,

                comments_count:
                  data.comments_count,
              },
            }
          : prev
      )

      const deletedCommentId =
        Number(data.comment_id)

      if (!deletedCommentId) return

      const removeComment = (
        list: any[]
      ): any[] =>

        list
          .filter(
            comment =>
              Number(comment.id) !==
              deletedCommentId
          )
          .map(comment => ({
            ...comment,

            replies: comment.replies
              ? removeComment(
                  comment.replies
                )
              : [],
          }))

      setComments(prev =>
        removeComment(prev)
      )
    },

    onCommentUpdated: (data) => {

      const updatedComment =
        data.comment

      if (!updatedComment) return

      const updateComment = (
        list: any[]
      ): any[] =>

        list.map(comment => {

          if (
            Number(comment.id) ===
            Number(updatedComment.id)
          ) {

            return {
              ...comment,
              ...updatedComment,
            }
          }

          return {
            ...comment,

            replies: comment.replies
              ? updateComment(
                  comment.replies
                )
              : [],
          }
        })

      setComments(prev =>
        updateComment(prev)
      )
    },

  })

  useEffect(() => {

    fetchShare()
    fetchCurrentUser()

  }, [])

  const fetchCurrentUser =
    async () => {

      try {

        const user =
          await apiRequest(
            'api/users/me/'
          )

        setCurrentUser(user)

      } catch (err) {

        console.error(err)

      }
    }

  const fetchShare = async () => {
    try {
      const data = await apiRequest(
        `api/shares/${shareId}/`
      )
  
      setShare(data)
  
      setLiked(data.post?.is_liked ?? false)
      setLikes(data.post?.likes_count ?? 0)
      setBookmarked(data.post?.is_bookmarked ?? false)
  
    } catch (err) {
      console.error("FETCH SHARE ERROR:", err)
    }
  }

  const handleLike =
    async () => {

      if (!share?.post?.id) return

      try {

        const result =
          await apiRequest(
            `api/likes/${share.post.id}/toggle/`,
            {
              method: 'POST'
            }
          )

        setLiked(result.liked)

        setLikes(
          result.likes_count
        )

      } catch (err) {

        console.error(err)

      }
    }

  const handleBookmark = async () => {
    const postId = share?.post?.id
  
    if (!postId) return

    const previousState = bookmarked
    setBookmarked(!previousState);
  
    try {
      const result = await apiRequest(
        `api/bookmarks/toggle/`,
        {
          method: "POST",
          data: {
            type: "share",
            share_id: share.id,
          },
        }
      );
  
      setBookmarked(result.bookmarked)
  
    } catch (err) {
      setBookmarked(previousState);
      console.error("Bookmark failed:", err)
    }
  }

  const onCommentsCountChange =
    (count: number) => {

      setShare((prev: any) =>
        prev
          ? {
              ...prev,

              post: {
                ...prev.post,

                comments_count:
                  count,
              },
            }
          : prev
      )
    }

  if (!share) {

    return (
      <div className="mt-10">
        <Skeleton />
      </div>
    )
  }

  const post = share.post
  const community = share.community

  return (

    <div className="max-w-3xl mx-auto my-24">

      {/* SHARE HEADER */}

      <div className="flex items-center gap-2 px-4 py-3 text-gray-500">

        <Share2 className="w-4 h-4" />

        <span className="font-medium">

          {share.user.username}
          {' shared to '}
          {community?.name ?? 'Community'}

        </span>

        <span className="ml-auto flex items-center text-sm">

          <AlarmClock className="mr-1 w-4 h-4" />

          {timeAgo(
            share.created_at
          )}

        </span>

      </div>

      {/* SHARE TEXT */}

      {share.share_text && (

        <div className="px-4 mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-line">

          <Linkify
            options={{
              defaultProtocol: "https",
              target: "_blank",
              rel: "noopener noreferrer",
              attributes: {
                class:
                  "text-indigo-600 hover:underline break-all",

                onClick: (
                  e: React.MouseEvent<HTMLAnchorElement>
                ) => {
                  e.stopPropagation()
                },
              },
            }}
          >

            {share.share_text}

          </Linkify>

        </div>

      )}

      {/* ORIGINAL POST */}

      <div className="px-4">

        {/* HEADER */}

        <div className="flex items-center gap-3 mb-6">

          <Avatar
            username={
              post.user.username
            }

            avatarUrl={
              post.user.avatar
            }

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

          <Linkify
            options={{
              defaultProtocol: "https",
              target: "_blank",
              rel: "noopener noreferrer",

              attributes: {
                class:
                  "text-indigo-600 hover:underline break-all",

                onClick: (
                  e: React.MouseEvent<HTMLAnchorElement>
                ) => {
                  e.stopPropagation()
                },
              },
            }}
          >

            <p className="mb-2 whitespace-pre-line text-gray-600 dark:text-gray-300">

              {post.caption}

            </p>

          </Linkify>

        )}

        {/* MEDIA */}

        {post.media_files?.length > 0 && (

          <div className="flex flex-col gap-4">

            {post.media_files.map(
              (
                media: any,
                index: number
              ) => (

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

              )
            )}

          </div>

        )}

        {/* ACTIONS */}

        <div className="flex items-center gap-6 my-6">

          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-gray-500 text-xs font-medium ${
              liked
                ? 'text-blue-600'
                : ''
            }`}
          >

            <ThumbsUp className="mr-2 h-4 w-4" />

            {likes > 0 && (
              <span>
                {likes}
              </span>
            )}

          </button>

          <button
            className="flex items-center gap-1 text-xs text-gray-500 font-medium"
          >

            <MessageCircle className="mr-2 w-4 h-4" />

            {post.comments_count > 0 && (

              <span>
                {post.comments_count}
              </span>

            )}

          </button>

          <ShareButton
            post={post}
            sharesCount={post.shares_count ?? 0}
            onOpen={(post) =>
              showShare(post)
            }
          />
  
          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1 text-xs font-medium transition ${
              bookmarked
                ? "text-blue-600"
                : "text-gray-500"
            }`}
            aria-label={
              bookmarked
                ? "Remove bookmark"
                : "Bookmark post"
            }
          >
            <Bookmark
              className={`mr-2 w-4 h-4 ${
                bookmarked ? "fill-current" : ""
              }`}
            />
          </button>

          {post.views_count !== undefined && (

            <span className="ml-auto flex text-xs items-center text-gray-400">

              <ChartNoAxesColumn className="mr-2 h-4 w-4" />

              {post.views_count}

            </span>

          )}

        </div>

        {/* COMMENTS */}

        <CommentList
          user={currentUser}
          postId={post.id}
          setReplyTarget={
            setReplyTarget
          }
          comments={comments}
          onCommentsCountChange={
            onCommentsCountChange
          }
          setComments={setComments}
        />

      </div>

      {/* COMMENT INPUT */}

      <div className="fixed bottom-0 left-0 w-full border-t bg-white dark:bg-gray-900 z-50">

        <div className="max-w-3xl mx-auto p-3">

          <CommentInput
            user={currentUser}
            postId={post.id}
            onCommentsCountChange={
              onCommentsCountChange
            }
            replyTarget={
              replyTarget
            }
            onClearReply={() =>
              setReplyTarget({
                id: null,
                type: null,
              })
            }
            onReplaceComment={
              onReplaceComment
            }
            onRemoveComment={
              onRemoveComment
            }
            onNewComment={(newComment) => {
              setComments(prev => {
                const exists = prev.some(
                  comment =>
                    Number(comment.id) === Number(newComment.id)
                )
            
                if (exists) return prev
            
                if (!newComment.parent) {
                  return [newComment, ...prev]
                }
            
                const addReply = (list: any[]): any[] =>
                  list.map(comment => {
                    if (
                      Number(comment.id) ===
                      Number(newComment.root_parent_id)
                    ) {
                      return {
                        ...comment,
                        replies: [
                          ...(comment.replies ?? []),
                          newComment,
                        ],
                      }
                    }
            
                    return {
                      ...comment,
                      replies: comment.replies
                        ? addReply(comment.replies)
                        : [],
                    }
                  })
            
                return addReply(prev)
              })
            }}
          />

        </div>

      </div>

    </div>
  )
}