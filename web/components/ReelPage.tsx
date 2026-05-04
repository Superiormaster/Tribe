'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/utils/api';
import CommentList from '@/components/CommentList'
import CommentInput from '@/components/CommentInput'
import ShareButton from '@/components/ShareButton'
import { Heart, MessageCircle, Eye, Volume2, VolumeX, Play, Share2, MoreVertical } from 'lucide-react';

export default function ReelsPage() {
  const [reels, setReels] = useState<any[]>([]);
  const currentUserId = 1;
  const [showHeart, setShowHeart] = useState<{ [key: number]: boolean }>({});
  const [openCommentsPostId, setOpenCommentsPostId] = useState<number | null>(null);
  const lastTapRef = useRef<{ [key: number]: number }>({});
  const [muted, setMuted] = useState(true);
  const [starredUsers, setStarredUsers] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);

  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRefs = useRef<Map<number, number>>(new Map());

  // FETCH REELS
  useEffect(() => {
    (async () => {
      const res = await apiRequest('api/post/?content_type=short_video');
      const normalized = (res.results || res || []).map((r: any) => ({
        ...r,
        id: r.id ?? r.pk ?? r.post_id, // safety fallback
      }));
    
      setReels(normalized);
    })();
  }, []);
  
  const handleDoubleTap = (reel: any) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[reel.id] || 0;
  
    const DOUBLE_TAP_DELAY = 300;
  
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // DOUBLE TAP DETECTED ❤️
  
      // show heart animation
      setShowHeart(prev => ({ ...prev, [reel.id]: true }));
  
      setTimeout(() => {
        setShowHeart(prev => ({ ...prev, [reel.id]: false }));
      }, 700);
  
      // auto-like if not already liked
      if (!reel.liked_by_user) {
        handleLike(reel);
      }
    }
  
    lastTapRef.current[reel.id] = now;
  };

  const toggleStar = async (userId: number) => {
    if (!userId) return;

    try {
      const res = await apiRequest(
        `api/users/star/${userId}/toggle/`,
        { method: "POST" }
      );
  
      setStarredUsers(prev => {
        const newSet = new Set(prev);
  
        if (res.starred) newSet.add(userId);
        else newSet.delete(userId);
  
        return newSet;
      });
    } catch (err) {
      console.error(err);
    }
  };
  
  const toggleLikeUI = (id: number) => {
    setReels(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, liked_by_user: !r.liked_by_user }
          : r
      )
    );
  };
  
  const handleLike = async (reel: any) => {
    if (!reel?.id) return;
  
    // ✅ optimistic UI update (instant feedback)
    setReels(prev =>
      prev.map(r =>
        r.id === reel.id
          ? {
              ...r,
              liked_by_user: !r.liked_by_user,
              likes_count: r.liked_by_user
                ? r.likes_count - 1
                : r.likes_count + 1,
            }
          : r
      )
    );
  
    try {
      const res = await apiRequest(`api/post/likes/${reel.id}/toggle/`, {
        method: "POST",
      });
  
      // optional sync correction
      setReels(prev =>
        prev.map(r =>
          r.id === reel.id
            ? {
                ...r,
                liked_by_user: res.liked,
                likes_count: res.likes_count,
              }
            : r
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // INTERSECTION OBSERVER (AUTO PLAY ONLY VISIBLE)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const id = Number(video.dataset.id);

          if (entry.isIntersecting) {
            video.play().catch(() => {});
            setActiveId(id);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.8 }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [reels]);

  // PROGRESS TRACKER
  useEffect(() => {
    const interval = setInterval(() => {
      videoRefs.current.forEach((video, id) => {
        if (!video || video.paused) return;

        const progress =
          video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0;

        progressRefs.current.set(id, progress);
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // TOGGLE MUTE
  const toggleMute = () => {
    setMuted(!muted);
    videoRefs.current.forEach(v => {
      if (v) v.muted = !muted;
    });
  };

  // SWIPE SUPPORT (TikTok style)
  const handleTouchStart = useRef(0);

  const handleTouchEnd = (e: any) => {
    const endY = e.changedTouches[0].clientY;
    const diff = handleTouchStart.current - endY;

    if (Math.abs(diff) < 50) return;

    const currentIndex = reels.findIndex(r => r.id === activeId);

    if (diff > 0 && currentIndex < reels.length - 1) {
      // swipe up → next
      scrollToReel(currentIndex + 1);
    }

    if (diff < 0 && currentIndex > 0) {
      // swipe down → prev
      scrollToReel(currentIndex - 1);
    }
  };
  
  const seekVideo = (id: number, seconds: number) => {
    const video = videoRefs.current.get(id);
    if (!video) return;
  
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      video.duration || Infinity
    );
  };

  const scrollToReel = (index: number) => {
    const video = videoRefs.current.get(reels[index]?.id);
    video?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-128px)] overflow-y-scroll snap-y snap-mandatory bg-black"
      onTouchStart={(e) => (handleTouchStart.current = e.touches[0].clientY)}
      onTouchEnd={handleTouchEnd}
    >

      {reels.map((reel) => (
  <ReelItem
    key={reel.id}
    reel={reel}
    muted={muted}
    setReels={setReels}
    handleLike={handleLike}
    toggleStar={toggleStar}
    starredUsers={starredUsers}
    currentUserId={currentUserId}
    videoRefs={videoRefs}
    setOpenCommentsPostId={setOpenCommentsPostId}
    handleDoubleTap={handleDoubleTap}
    showHeart={showHeart}
    activeId={activeId}
  />
))}
      {reels.map((reel) => {
        const progress = progressRefs.current.get(reel.id) || 0;

        return (
          <div
            key={reel.id}
            id={`reel-${reel.id}`}
            onClick={() => handleDoubleTap(reel)}
            className="h-full w-full snap-start relative"
          >

            {/* VIDEO */}
            <video
              data-id={reel.id}
              ref={(el) => {
                if (el) {
                  el.muted = muted;
                  videoRefs.current.set(reel.id, el);
                }
              }}
              src={reel.media_files?.[0]?.file_url}
              className="h-full w-full object-cover"
              loop
              playsInline
            />

            <div className="absolute bottom-32 left-4 flex gap-4 text-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  seekVideo(reel.id, -10);
                }}
                className="bg-black/50 px-3 py-1 rounded"
              >
                -10s
              </button>
            
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  seekVideo(reel.id, 10);
                }}
                className="bg-black/50 px-3 py-1 rounded"
              >
                +10s
              </button>
            </div>

            {showHeart[reel.id] && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-[heartPop_0.7s_ease-out]" />
              </div>
            )}

            {/* DARK OVERLAY */}
            <div className="absolute inset-0 bg-black/20" />

            {/* PLAY ICON WHEN PAUSED */}
            {activeId !== reel.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="text-white w-12 h-12 opacity-60" />
              </div>
            )}

            {/* PROGRESS BAR */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-700">
              <div
                className="h-1 bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* RIGHT ACTIONS */}
            <div className="absolute right-3 bottom-24 flex flex-col gap-6 text-white">
              <button onClick={() => handleLike(reel)}  
              className={`flex flex-col items-center gap-1 font-medium ${  
                reel.liked_by_user ? "text-red-600" : ""  
              }`}>
                <Heart className="w-7 h-7" />
                <span className="text-xs">{reel.likes_count}</span>
              </button>

              <button onClick={(e) => {
                e.stopPropagation();
                setOpenCommentsPostId(reel.id);
              }} className="flex flex-col items-center">
                <MessageCircle className="w-7 h-7" />
                <span className="text-xs">{reel.comments_count}</span>
              </button>

              <button className="flex flex-col items-center">
                <Eye className="w-7 h-7" />
                <span className="text-xs">{reel.views_count || 0}</span>
              </button>
              <ShareButton post={reel} />

              <button className="flex-1" onClick={toggleMute}>
                {muted ? <VolumeX /> : <Volume2 />}
              </button>
              <button className="text-xs text-white">
                <MoreVertical />
              </button>
            </div>

            {/* CAPTION */}
            <div className="absolute bottom-10 left-4 text-white max-w-[70%]">
  
              {/* USER ROW (username + star) */}
              <div className="flex items-center gap-3">
                <p className="font-bold">@{reel.user.username}</p>
            
                {reel.user?.id && reel.user.id !== currentUserId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!reel.user?.id) return;
                      toggleStar(reel.user.id);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      starredUsers.has(reel.user.id)
                        ? "bg-yellow-500 text-black"
                        : "bg-white text-black"
                    }`}
                  >
                    {starredUsers.has(reel.user.id) ? "⭐ Starred" : "⭐ Star"}
                  </button>
                )}
              </div>
            
              {/* CAPTION BELOW */}
              <p className="text-sm mt-2">{reel.caption}</p>
            </div>

          </div>
        );
      })}

      {openCommentsPostId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end">
      
          {/* CLICK OUTSIDE TO CLOSE */}
          <div
            className="flex-1"
            onClick={() => setOpenCommentsPostId(null)}
          />
      
          {/* COMMENT PANEL */}
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl max-h-[80%] flex flex-col">
      
            {/* HEADER */}
            <div className="p-3 border-b text-center font-semibold">
              Comments
            </div>
      
            {/* COMMENT LIST */}
            <div className="flex-1 overflow-y-auto p-3">
              <CommentList postId={openCommentsPostId} />
            </div>
      
            {/* INPUT */}
            <CommentInput postId={openCommentsPostId} />
      
          </div>
        </div>
      )}
    </div>
  );
}

function ReelItem({
  reel,
  muted,
  setReels,
  handleLike,
  toggleStar,
  starredUsers,
  currentUserId,
  videoRefs,
  setOpenCommentsPostId,
  handleDoubleTap,
  showHeart,
  activeId,
}: any) {

  // ✅ VIEW TRACKING
  useReelView(reel.id, () => {
    setReels((prev: any[]) =>
      prev.map(r =>
        r.id === reel.id
          ? { ...r, views_count: (r.views_count || 0) + 1 }
          : r
      )
    );
  });

  return (
    <div
      id={`reel-${reel.id}`} // ✅ IMPORTANT
      onClick={() => handleDoubleTap(reel)}
      className="h-full w-full snap-start relative"
    >

      {/* VIDEO */}
      <video
        data-id={reel.id}
        ref={(el) => {
          if (el) {
            el.muted = muted;
            videoRefs.current.set(reel.id, el);
          }
        }}
        src={reel.media_files?.[0]?.file_url}
        className="h-full w-full object-cover"
        loop
        playsInline
      />

      {/* ❤️ HEART */}
      {showHeart[reel.id] && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-[heartPop_0.7s_ease-out]" />
        </div>
      )}

      {/* ACTIONS */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 text-white">

        <button onClick={() => handleLike(reel)}>
          <Heart className="w-7 h-7" />
          <span className="text-xs">{reel.likes_count}</span>
        </button>

        <button onClick={(e) => {
          e.stopPropagation();
          setOpenCommentsPostId(reel.id);
        }}>
          <MessageCircle className="w-7 h-7" />
          <span className="text-xs">{reel.comments_count}</span>
        </button>

        <button>
          <Eye className="w-7 h-7" />
          <span className="text-xs">{reel.views_count || 0}</span>
        </button>

      </div>
    </div>
  );
}