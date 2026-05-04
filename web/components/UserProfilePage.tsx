'use client';
import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserContext } from '@/components/UserContext';
import { 
  Home, Edit, Trash2, Share2, Star, MessageCircle, Camera, Image, Video, ThumbsUp, Repeat, Send as SendIcon, ChartNoAxesColumn
} from 'lucide-react';
import Skeleton from '@/components/Skeleton';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { usePostView } from '@/lib/UsePostView'
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
  const router = useRouter();
  const { user: currentUser } = useContext(UserContext) || {};
  const username = Array.isArray(params.username) ? params.username[0] : params.username || '';
  const [profileUserId, setProfileUserId] = useState<number | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
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

  // Fetch profile and posts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiRequest(`api/users/profile/${username}/`);
        const profileData = data.profile;

        setProfile({
          avatar: profileData.avatar || '',
          cover_photo: profileData.cover_photo || '',
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          city: profileData.city || '',
          country: profileData.country || '',
          website: profileData.website || '',
          creatorType: profileData.creator_type || '',
          stars: profileData.starred_count || 0,
          posts: data.stats?.posts || 0,
          starredBy: profileData.stars_count || 0
        });

        const postsData: Post[] = (data.posts || []).filter((p: any) => !p.is_deleted).map((p: any) => ({
          id: p.id,
          caption: p.caption,
          created_at: p.created_at,
          likes_count: p.likes_count || 0,
          comments_count: p.comments || 0,
          liked_by_user: p.is_liked || false,
          content_type: p.content_type || (p.video ? "video" : "post"),
          user: p.user || {
            id: 0,
            username: "Unknown",
            avatar: "",
          },
          media_files: Array.isArray(p.media_files)
          ? p.media_files.map((m: any) => ({
              file_url: m.file_url || m.url || '',
              thumbnail_url: m.thumbnail_url || '',
              media_type: m.media_type || (m.file_url?.endsWith('.mp4') ? 'video' : 'image'),
            }))
          : p.video
          ? [{ file_url: p.video, media_type: 'video', thumbnail_url: p.thumbnail || '' }]
          : p.image
          ? [{ file_url: p.image, media_type: 'image' }]
          : [],
          community_name: p.community_name || '',
        }));

        setPosts(postsData);
        setFilteredPosts(postsData);
        setProfileUserId(profileData.id);
        setRelationship({
          is_me: data.relationship?.is_me || false,
          is_star: data.relationship?.is_star || false,
          is_connected: data.relationship?.is_connected || false,
          request_sent: data.relationship?.request_sent || false,
          request_received: data.relationship?.request_received || false,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchData();
  }, [username]);

  // Filter posts by type
  useEffect(() => {
    const filtered = posts.filter((p) => {
      if (filter === 'images') return p.media_files.some(m => m.media_type === 'image');
      if (filter === 'videos') return p.media_files.some(m => m.media_type === 'video');
      return true;
    });
    setFilteredPosts(filtered);
  }, [filter, posts]);

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

  const handleEditProfile = () => router.push('/main/edit-profile');

  const handlePostAction = async (action: string, postId: number) => {
    switch (action) {
      case 'edit':
        router.push(`/main/create-post?edit=true&postId=${postId}`);
        break;
  
      case 'delete':
        console.log('Delete post', postId);
        break;
  
      case 'repost': {
        try {
          const res = await apiRequest(`api/post/${postId}/repost/`, {
            method: "POST"
          });
  
          alert(res.reposted ? "Reposted!" : "Already reposted");
        } catch (err) {
          console.error(err);
        }
        break;
      }
  
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
              <button onClick={() => router.push(`/main/stars/received`)} className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400"/><span className="font-semibold">{profile.starredBy}</span> Stars</button>
              <button onClick={() => router.push(`/main/stars/sent`)}><span className="font-semibold">{profile.stars}</span> Starred</button>
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
                  Connected • Chat Available
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
                {relationship.is_star ? 'Starred ⭐' : 'Star'}
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
      {filteredPosts.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">No posts yet.</p>
      ) : filteredPosts.map((post) =>
          post.content_type === "short_video" ? (
            <ReelCard key={post.id} post={post} />
          ) : (
            <PostCard
              key={post.id}
              post={post}
              videoRef={videoRef}
              currentUser={currentUser}
              isMyProfile={isMyProfile}
              handlePostAction={handlePostAction}
              onDelete={(id: number) => {
                setPosts(prev => prev.filter(p => p.id !== id));
              }}
              onViewed={() => {
                setPosts(prev =>
                  prev.filter(p => !p.is_deleted).map(p =>
                    p.id === post.id
                      ? { ...p, views_count: (p.views_count || 0) + 1 }
                      : p
                  )
                );
              }}
            />
          )
        )
      }

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
    </div>
  );
}

// PostCard Component
function PostCard({ post, onViewed, videoRef, onDelete, currentUser, isMyProfile, handlePostAction }: any) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count);
  const isOwner = currentUser?.id === post.user?.id;

  if (post.content_type === "short_video") return null;

  const handleLike = async () => {
    try {
      const result = await apiRequest(`api/post/likes/${post.id}/toggle/`, { method: "POST" });
      setLiked(result.liked);
      setLikes(result.likes_count);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;

    try {
      await apiRequest(`api/post/${post.id}/`, { method: "DELETE" });

      onDelete(post.id);

      alert("Post deleted");
      setMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };
  
  usePostView(post.id, onViewed);

  return (
    <div id={`post-${post.id}`} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm space-y-2 mt-2">
      {/* Post Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {post.user.avatar ? (
            <img
              src={post.user.avatar}
              alt={post.user.username}
              className="w-10 h-10 rounded-full object-cover cursor-pointer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold cursor-pointer">
              {post.user.username.slice(0,2).toUpperCase()}
            </div>
          )}
          <div>
          {post.community_name && (
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {post.community_name}
            </span>
          )}
            <p className="text-gray-700 dark:text-gray-300 font-semibold">{post.user.username}</p>
            <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
          </div>
        </div>
        {isMyProfile && (
          <div className="flex gap-2">
            <button onClick={()=>handlePostAction('edit', post.id)}><Edit className="w-5 h-5 text-gray-500 hover:text-indigo-600"/></button>
            <button onClick={handleDelete}><Trash2 className="w-5 h-5 text-gray-500 hover:text-red-600"/></button>
            <button onClick={()=>handlePostAction('repost', post.id)}>
              <Repeat className="w-5 h-5 text-gray-500 hover:text-indigo-600"/>
            </button>
          </div>
        )}
      </div>

      <div onClick={() => router.push(`/main/home/${post.id}`)} className="cursor-pointer">
        {post.caption && (
          <p className="text-gray-800 dark:text-gray-200 line-clamp-3 mb-2 whitespace-pre-line">
            {post.caption}
          </p>
        )}
      
        {post.media_files?.length > 0 && (
          <div className={`grid gap-2 ${
            post.media_files.length === 1
              ? "grid-cols-1"
              : post.media_files.length === 2
              ? "grid-cols-2"
              : "grid-cols-2 md:grid-cols-3"
          }`}>
            {post.media_files.map((media, index) => {
              const isVideo = media.media_type === "video";
      
              return (
                <div key={index} className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                  
                  {!isVideo && (
                    <img
                      src={media.file_url}
                      className="w-full max-h-[500px] object-cover"
                      loading="lazy"
                    />
                  )}
      
                  {isVideo && (
                    <video
                      src={media.file_url}
                      poster={media.thumbnail_url}
                      controls
                      preload="metadata"
                      className="w-full max-h-[500px] aspect-video object-cover"
                    />
                  )}
      
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center gap-6 mt-2">
        <button onClick={handleLike} className={`flex items-center gap-1 font-medium ${liked ? 'text-blue-600' : 'text-gray-500'}`}><ThumbsUp className="mr-2"/>{likes}</button>
        <button onClick={() => router.push(`/main/home/${post.id}`)} className="flex items-center gap-1 text-gray-500 font-medium"><MessageCircle className="mr-2"/>{post.comments_count}</button>
        <ShareButton post={post} />
          {post.views_count !== undefined && <span className="flex items-center text-gray-500"> <ChartNoAxesColumn className="mr-2" /> {post.views_count} views</span>}
      </div>
    </div>
  );
}

function ReelCard({ post }: any) {
  const router = useRouter();
  
  const goToReel = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // safety
    router.push(`/main/reels/${post.id}`);
  };
  
  const poster =
    post.media_files?.find((m: any) => m.thumbnail_url)?.thumbnail_url ||
    post.media_files?.[0]?.thumbnail_url ||
    '';

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-xl bg-black">

      {/* Video Preview (no controls, no autoplay) */}
      <video
        src={post.media_files?.[0]?.file_url}
        poster={poster}
        preload="metadata"
        className="w-full h-full object-cover"
        muted
        playsInline
      />

      {/* ▶️ Play Button → REDIRECT */}
      <button
        onClick={goToReel}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="bg-black/60 p-4 rounded-full text-white text-xl">
          ▶
        </div>
      </button>

      {/* Caption */}
      {post.caption && (
        <div className="absolute bottom-3 left-3 right-3 text-white text-sm font-medium line-clamp-2">
          {post.caption}
        </div>
      )}
    </div>
  );
}