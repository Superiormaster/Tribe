'use client';
import { useState, useEffect, useMemo, useContext } from 'react';
import { useParams } from 'next/navigation';
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { UserContext } from '@/components/UserContext';
import { 
  Home, Star, Camera, Image, Video,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import Skeleton from '@/components/Skeleton';
import { uploadToCloudinary } from '@/utils/cloudinary';
import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import RepostCard from '@/components/repost/RepostCard';
import SortablePinnedPost from '@/components/SortablePinnedPost';
import ShareButton from '@/components/ShareButton'
import {
  connectUser,
  removeConnection,
  cancelConnection,
  starCreator,
  getConnectedUsers
} from '@/lib/api'
import { apiRequest } from '@/utils/api';

type Post = {
  id: number;
  user: {
    id: number
    username: string
    avatar?: string
  }
  caption?: string;
  media_files: { file_url: string; thumbnail_url?: string; media_type: 'image' | 'video' }[];
  content_type: string;
  likes_count: number;
  comments_count: number;
  liked_by_user: boolean;
  created_at: string;
  community_name?: string;
  views_count?: number
  is_deleted?: boolean;
  profile_pinned?: boolean
  profile_pin_order?: number | null
  community_pinned?: boolean
  community_pin_order?: number | null
};

type Profile = {
  avatar: string;
  cover_photo: string;
  full_name: string;
  bio: string;
  city: string;
  country: string;
  website: string;
  creatorType: string;
  stars: number;
  posts: number;
  starredBy: number;
};

export default function UserProfilePage({ videoRef }: { videoRef?: (el: HTMLVideoElement) => void }) {
  const params = useParams();
  const { push } = useNavigation()
  const { user: currentUser } = useContext(UserContext) || {};
  const username = Array.isArray(params.username) ? params.username[0] : params.username || '';
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showUnstarModal, setShowUnstarModal] = useState(false);
  const [relationship, setRelationship] = useState({
    is_me: false,
    is_star: false,
    is_connected: false,
    request_sent: false,
    request_received: false
  })
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');

  const isMyProfile = currentUser?.username === username;
  
  const orderedPosts = useMemo(() => {

    return [...posts].sort((a, b) => {
  
      // pinned first
      if (
        a.profile_pinned &&
        !b.profile_pinned
      ) return -1
  
      if (
        !a.profile_pinned &&
        b.profile_pinned
      ) return 1
  
      // pin order
      if (
        a.profile_pinned &&
        b.profile_pinned
      ) {
  
        return (
          (a.profile_pin_order || 0) -
          (b.profile_pin_order || 0)
        )
      }
  
      // newest first
      return (
        new Date(
          b.created_at
        ).getTime() -
        new Date(
          a.created_at
        ).getTime()
      )
    })
  
  }, [posts])
  
  const filteredPosts = useMemo(() => {
  
    return orderedPosts.filter(post => {
  
      if (filter === "images") {
  
        return post.media_files.some(
          m => m.media_type === "image"
        )
      }
  
      if (filter === "videos") {
  
        return post.media_files.some(
          m => m.media_type === "video"
        )
      }
  
      return true
    })
  
  }, [orderedPosts, filter])
  
  const pinnedPosts = filteredPosts
    .filter(p => 
      p.type === "post" &&
      p.profile_pinned
    )
    .sort(
      (a, b) =>
        (a.profile_pin_order || 0) -
        (b.profile_pin_order || 0)
    )
  
  const normalPosts = filteredPosts.filter(
    p => !p.profile_pinned
  )
  
  const handleTogglePin = async (postId: number) => {
  
    const previousPosts = [...posts]
    const target = posts.find(p => p.id === postId)
  
    if (!target) return
  
    const isPinned = target.profile_pinned
  
    // -------------------------
    // OPTIMISTIC UPDATE
    // -------------------------
  
    let updatedPosts = [...posts]
  
    if (isPinned) {

      updatedPosts = updatedPosts
        .map(p =>
          p.id === postId
            ? {
                ...p,
                profile_pinned: false,
                profile_pin_order: null
              }
            : p
        )
    
      // reorder remaining pins
      const remainingPinned = updatedPosts
        .filter(p => p.profile_pinned)
        .sort(
          (a, b) =>
            (a.profile_pin_order || 0) -
            (b.profile_pin_order || 0)
        )
    
      remainingPinned.forEach((p, index) => {
        p.profile_pin_order = index + 1
      })
    } else {
  
      const currentPinned = updatedPosts.filter(
        p => p.profile_pinned
      )
  
      if (currentPinned.length >= 3) {
        alert("Maximum 3 pinned posts")
        return
      }
  
      updatedPosts = updatedPosts.map(p =>
        p.id === postId
          ? {
              ...p,
              profile_pinned: true,
              profile_pin_order:
                currentPinned.length + 1
            }
          : p
      )
    }
  
    setPosts(updatedPosts)
  
    // -------------------------
    // API CALL
    // -------------------------
  
    try {
  
      await apiRequest(
        `api/post/${postId}/toggle_profile_pin/`,
        {
          method: "POST"
        }
      )
  
    } catch (err) {
  
      // ROLLBACK
      setPosts(previousPosts)
  
      console.error(err)
    }
  }
  
  const handleDragEnd = async (event: any) => {

    const { active, over } = event
  
    if (!over || active.id === over.id) return
  
    const pinned = posts
      .filter(p => p.profile_pinned)
      .sort(
        (a, b) =>
          (a.profile_pin_order || 0) -
          (b.profile_pin_order || 0)
      )
  
    const oldIndex = pinned.findIndex(
      p => p.id === active.id
    )
  
    const newIndex = pinned.findIndex(
      p => p.id === over.id
    )
  
    const reorderedPinned = arrayMove(
      pinned,
      oldIndex,
      newIndex
    ).map((p, index) => ({
      ...p,
      profile_pin_order: index + 1,
    }))
  
    const regularPosts = posts.filter(
      p => !p.profile_pinned
    )
  
    const updatedPosts = [
      ...reorderedPinned,
      ...regularPosts,
    ]
  
    setPosts(updatedPosts)
  
    try {
  
      await apiRequest(
        "api/post/reorder_pins/",
        {
          method: "POST",
          data: {
            post_ids: reorderedPinned.map(
              p => p.id
            ),
          },
        }
      )
  
    } catch (err) {
  
      console.error(err)
    }
  }
  
  const starredUserIds = useMemo(() => {
    return new Set(
      posts
        .filter(p => p.user.is_starred_by_user)
        .map(p => p.user.id)
    );
  }, [posts]);

  const mapPost = (p: any): any => {

    if (!p) return null;
  
    // REPOST
    if (p.type === "repost") {
    
      return {
        type: "repost",
    
        id: p.data.id,
    
        created_at: p.data.created_at,
    
        repost_type: p.data.repost_type,
    
        quote_text: p.data.quote_text,
    
        user: p.data.user,
    
        post: {
          ...p.data.post,
    
          profile_pinned:
            p.data.post?.profile_pinned || false,
    
          profile_pin_order:
            p.data.post?.profile_pin_order || null,
    
          community_pinned:
            p.data.post?.community_pinned || false,
    
          community_pin_order:
            p.data.post?.community_pin_order || null,
    
          likes_count:
            p.data.post?.likes_count || 0,
    
          comments_count:
            p.data.post?.comments_count || 0,
    
          shares_count:
            p.data.post?.shares_count || 0,
    
          liked_by_user:
            p.data.post?.is_liked || false,
    
          updated_at:
            p.data.post?.updated_at || null,
    
          media_files: Array.isArray(
            p.data.post?.media_files
          )
            ? p.data.post.media_files.map((m: any) => ({
                file_url:
                  m.file_url || m.url || "",
    
                thumbnail_url:
                  m.thumbnail_url || "",
    
                media_type:
                  m.media_type ||
                  (
                    m.file_url?.endsWith(".mp4")
                      ? "video"
                      : "image"
                  ),
              }))
            : [],
        },
      };
    }
  
    // NORMAL POST
    return {
      ...p.data,
  
      type: "post",
  
      profile_pinned:
        p.data?.profile_pinned || false,
  
      profile_pin_order:
        p.data?.profile_pin_order || null,
  
      community_pinned:
        p.data?.community_pinned || false,
  
      community_pin_order:
        p.data?.community_pin_order || null,
  
      caption:
        p.data?.caption || "",
  
      created_at:
        p.data?.created_at || "",
  
      likes_count:
        p.data?.likes_count || 0,
  
      comments_count:
        p.data?.comments_count || 0,
  
      shares_count:
        p.data?.shares_count || 0,
  
      liked_by_user:
        p.data?.is_liked || false,
  
      content_type:
        p.data?.content_type ||
        (p.data?.video ? "video" : "post"),
  
      user:
        p.data?.user || {
          id: 0,
          username: "Unknown",
          avatar: "",
        },
  
      updated_at:
        p.data?.updated_at || null,
  
      media_files: Array.isArray(
        p.data?.media_files
      )
        ? p.data.media_files.map((m: any) => ({
            file_url:
              m.file_url || m.url || "",
  
            thumbnail_url:
              m.thumbnail_url || "",
  
            media_type:
              m.media_type ||
              (
                m.file_url?.endsWith(".mp4")
                  ? "video"
                  : "image"
              ),
          }))
        : [],
  
      community_name:
        p.data?.community_name || "",
    };
  };
  
  const fetchProfile = async () => {
  
    try {
  
      const data = await apiRequest(
        `api/users/profile/${username}/`
      )
      console.log("PROFILE API RESPONSE:", data);

      const profileData = data?.profile || data;
  
      if (!profileData) {
        console.error("Profile data missing:", data);
        return;
      }
  
      setProfile({
        avatar: profileData.avatar || "",
        cover_photo:
          profileData.cover_photo || "",
        full_name:
          profileData.full_name || "",
        bio: profileData.bio || "",
        city: profileData.city || "",
        country:
          profileData.country || "",
        website:
          profileData.website || "",
        creatorType:
          profileData.creator_type || "",
        stars:
          profileData.starred_count || 0,
        posts:
          data.stats?.posts || 0,
        starredBy:
          profileData.stars_count || 0,
      })
  
      setProfileUserId(profileData.id)
  
      setRelationship({
        is_me:
          data.relationship?.is_me || false,
  
        is_star:
          data.relationship?.is_star || false,
  
        is_connected:
          data.relationship?.is_connected ||
          false,
  
        request_sent:
          data.relationship?.request_sent ||
          false,
  
        request_received:
          data.relationship
            ?.request_received || false,
      })
  
    } catch (err) {
  
      console.error(err)
  
    }
  }
  
  const fetchPosts = async (
    url?: string
  ) => {
  
    if (loadingMore) return
  
    try {
  
      setLoadingMore(true)
  
      const endpoint =
        url ||
        `api/users/profile/${username}/posts/`
  
      const data = await apiRequest(
        endpoint
      )
  
      const newPosts = (
        data.results || []
      ).map(mapPost)
  
      setPosts(prev => {
  
        if (!url) return newPosts
  
        const merged = [
          ...prev,
          ...newPosts
        ]
  
        // remove duplicates
        const unique = merged.filter(
          (post, index, self) =>
            index ===
            self.findIndex(
              x => x.id === post.id
            )
        )
  
        return unique
      })
  
      setNextPage(data.next || null)
  
    } catch (err) {
  
      console.error(err)
  
    } finally {
  
      setLoadingMore(false)
    }
  }
  
  useEffect(() => {

    if (!username) return
  
    const load = async () => {
  
      try {
  
        setLoading(true)
  
        await Promise.all([
          fetchProfile(),
          fetchPosts()
        ])
  
      } finally {
  
        setLoading(false)
      }
    }
  
    load()
  
  }, [username])

  // handle avatar change with preview + automatic upload
  const handleChangeAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
  
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = () => setProfile(prev => prev ? { ...prev, avatar: reader.result as string } : prev);
      reader.readAsDataURL(file);
  
      // Upload automatically
      try {
        const url = await uploadToCloudinary({
          file,
          folder: 'Tribe/Avatars',
          onProgress: (percent) => console.log(`Avatar upload: ${percent}%`)
        });
        await apiRequest(`api/users/me/`, {
          method: 'PATCH',
          data: { avatar: url },
        });
        console.log('Avatar uploaded:', url);
      } catch (err) {
        console.error('Avatar upload failed', err);
      }
    };
    input.click();
  };
  
  const handleStar = async () => {
    if (!profileUserId) return;

    try {
      const res = await starCreator(profileUserId) // or from API
      setRelationship(prev => ({
        ...prev,
        is_star: res.starred
      }))
    } catch (err) {
      console.error(err)
    }
  }
  
  const handleConnect = async () => {
    if (!profileUserId) return;

    try {
      const res = await connectUser(profileUserId)
  
      setRelationship(prev => ({
        ...prev,
        request_sent: true,
        is_connected: false
      }))
    } catch (err) {
      console.error(err)
    }
  }

  // handle cover change with preview + automatic upload
  const handleChangeCover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
  
      // Preview immediately
      const reader = new FileReader();
      reader.onload = () => setProfile(prev => prev ? { ...prev, cover_photo: reader.result as string } : prev);
      reader.readAsDataURL(file);
  
      // Upload automatically
      try {
        const url = await uploadToCloudinary({
          file,
          folder: 'Tribe/Covers',
          onProgress: (percent) => console.log(`Cover upload: ${percent}%`)
        });
        await apiRequest(`api/users/me/`, {
          method: 'PATCH',
          data: { cover_photo: url },
        });
        console.log('Cover uploaded:', url);
      } catch (err) {
        console.error('Cover upload failed', err);
      }
    };
    input.click();
  };

  const handleEditProfile = () => push('/main/edit-profile');

  const handlePostAction = async (
    action: string,
    postId: number
  ) => {
  
    switch (action) {
  
      // EDIT POST
      case 'edit':
        push(
          `/main/create-post?edit=true&postId=${postId}`
        );
        break;
  
      // DELETE POST
      case 'delete':
        console.log('Delete post', postId);
        break;
  
      // NORMAL REPOST
      case 'repost_normal':
  
        try {
  
          await apiRequest(
            `api/post/${postId}/repost/`,
            {
              method: 'POST',
              data: {
                type: 'normal',
              },
            }
          );
  
          alert("Reposted!");
  
        } catch (err) {
  
          console.error(err);
        }
  
        break;
  
      // QUOTE REPOST
      case 'repost_quote':
  
        push(`/main/repost/${postId}`);
  
        break;
  
      case 'delete_repost':
        try {
          await apiRequest(
            `api/post/${postId}/delete_repost/`,
            {
              method: 'POST',
            }
          );
      
          alert("Repost deleted");
        } catch (err) {
          console.error(err);
        }
        break;

      default:
        break;
    }
  };

  if (loading || !profile) return <div className="flex items-center justify-center h-screen"><Skeleton /></div>;

  return (
    <div className="max-w-3xl mt-6 space-y-4">

      {/* Cover Photo */}
      <div className="relative h-40 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-indigo-500 transition">
        {profile.cover_photo
          ? <img src={profile.cover_photo} alt="Cover" className="w-full h-full object-cover" />
          : <span className="text-gray-400 dark:text-gray-500 text-sm">Tribe Cover Photo</span>
        }
        {isMyProfile && (
          <button onClick={handleChangeCover} className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition">
            <Camera className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
        <div className="flex flex-row gap-4 items-center">
          <div className="relative w-24 h-24">
            {profile.avatar ? (
              <img src={profile.avatar} alt={username} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-400 text-white flex items-center justify-center text-xl font-bold">
                {username.slice(0,2).toUpperCase()}
              </div>
            )}
            {isMyProfile && (
              <button
                onClick={handleChangeAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1 text-gray-800 dark:text-gray-200">
            <h1 className="text-xl font-medium">{profile.full_name}</h1>
            <p className="text-xs font-bold">@{username}</p>
            {profile.bio && <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.bio}</p>}
            <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <div><span className="font-semibold">{profile.posts}</span> Posts</div>
              <AppLink prefetch={false} href={`/main/stars/received`} className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400"/><span className="font-semibold">{profile.stars}</span> Stars</AppLink>
              <AppLink prefetch={false} href={`/main/stars/sent`}><span className="font-semibold">{profile.starredBy}</span> Starred</AppLink>
            </div>
          </div>
        </div>

        {profile.website && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
            {new URL(profile.website).hostname}
          </a>
        )}

        <div className="flex gap-3">

          {isMyProfile && (
            <button onClick={handleEditProfile}
              className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg">
              Edit Profile
            </button>
          )}
        
          {!relationship.is_me && (
            <>
              {/* CONNECTED */}
              {relationship.is_connected && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg">
                  Connected
                </button>
              )}
          
              {/* REQUEST SENT */}
              {!relationship.is_connected && relationship.request_sent && (
                <button disabled className="px-4 py-2 bg-gray-500 text-white rounded-lg">
                  Request Sent
                </button>
              )}
          
              {/* DEFAULT CONNECT */}
              {!relationship.is_connected &&
                !relationship.request_sent && (
                  <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Connect
                  </button>
              )}
          
              {/* STAR BUTTON */}
              <button
                onClick={() => {
                  if (relationship.is_star) {
                    setShowUnstarModal(true);
                  } else {
                    handleStar();
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  relationship.is_star ? 'bg-yellow-500' : 'bg-indigo-600'
                }`}
              >
                {relationship.is_star ? '⭐' : 'Star'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center gap-4 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm">
        <button className={`p-2 rounded-lg ${filter==='all' ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400'}`} onClick={()=>setFilter('all')}><Home className="w-5 h-5"/></button>
        <button className={`p-2 rounded-lg ${filter==='images' ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400'}`} onClick={()=>setFilter('images')}><Image className="w-5 h-5"/></button>
        <button className={`p-2 rounded-lg ${filter==='videos' ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400'}`} onClick={()=>setFilter('videos')}><Video className="w-5 h-5"/></button>
      </div>

      {/* Posts */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* ---------------- PINNED POSTS ---------------- */}
        <SortableContext
          items={pinnedPosts.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {pinnedPosts.map((post) => (
            <SortablePinnedPost
              key={post.id}
              post={post}
            >
              {post.content_type === "short_video" ? (
                <ReelCard
                  post={post}
                />
              ) : (
                <PostCard
                  post={post}
                  videoRef={videoRef}
                  currentUser={currentUser}
                  isMyProfile={isMyProfile}
                  handlePostAction={handlePostAction}
                  showManageButtons={isMyProfile}
                  hideStarButton={true}
                  showJoinButton={false}
                  onToggleProfilePin={handleTogglePin}
                  isPinnedDraggable={true}
                  canEdit={true}
                  canRepost={true}
                  canDelete={true}
                  onDelete={(id: number) => {
                    setPosts(prev =>
                      prev.filter(p => p.id !== id)
                    )
                  }}
                  onViewed={() => {
                    setPosts(prev =>
                      prev.map(p =>
                        p.id === post.id
                          ? {
                              ...p,
                              views_count:
                                (p.views_count || 0) + 1
                            }
                          : p
                      )
                    )
                  }}
                />
              )}
            </SortablePinnedPost>
          ))}
        </SortableContext>
      
        {/* ---------------- NORMAL POSTS ---------------- */}
        {normalPosts.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
            No posts yet.
          </p>
        ) : (
          normalPosts.map((item) => {

            if (!item) return null;

            // REPOST
            if (item.type === "repost") {
              return (
                <RepostCard
                  key={`repost-${item.id}`}
                  repost={item}
                  handlePostAction={handlePostAction}
                  starredUserIds={starredUserIds}
                  hideStarButton={true}
                />
              );
            }
          
            // SHORT VIDEO
            if (item.content_type === "short_video") {
              return (
                <ReelCard
                  key={item.id}
                  post={item}
                />
              );
            }
          
            // NORMAL POST
            return (
              <PostCard
                key={item.id}
          
                post={item}
          
                videoRef={videoRef}
          
                currentUser={currentUser}
          
                isMyProfile={isMyProfile}
          
                handlePostAction={
                  handlePostAction
                }
          
                showManageButtons={
                  isMyProfile
                }
          
                canEdit={true}
          
                canRepost={true}
          
                canDelete={true}
          
                hideStarButton={true}
          
                showJoinButton={false}
          
                showPinnedLabel={false}
          
                isPinnedDraggable={false}
          
                onToggleProfilePin={
                  handleTogglePin
                }
          
                onDelete={(id: number) => {
          
                  setPosts(prev =>
                    prev.filter(
                      p => p.id !== id
                    )
                  )
          
                }}
          
                onViewed={() => {
          
                  setPosts(prev =>
                    prev.map(p =>
                      p.id === item.id
                        ? {
                            ...p,
          
                            views_count:
                              (
                                p.views_count || 0
                              ) + 1
                          }
                        : p
                    )
                  )
          
                }}
              />
            );
          })
        )}
      </DndContext>

    {showUnstarModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-indigo-700 p-6 rounded-xl w-80 text-center">
          <h2 className="text-lg font-semibold mb-4">
            Unstar this user?
          </h2>
    
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowUnstarModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg"
            >
              Cancel
            </button>
    
            <button
              onClick={async () => {
                await handleStar();
                setShowUnstarModal(false);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              Unstar
            </button>
          </div>
        </div>
      </div>
    )}

    {nextPage && (
      <div className="flex justify-center py-4">
        <button
          onClick={() => fetchData(nextPage)}
          disabled={loadingMore}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      </div>
    )}
    </div>
  );
}