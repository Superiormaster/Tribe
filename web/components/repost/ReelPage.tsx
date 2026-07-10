'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import CommentsModal from '@/components/CommentsModal'
import ShareButton from '@/components/ShareButton'
import { useSmartPostView } from '@/lib/useSmartPostView'
import { Heart, MessageCircle, Eye, Volume2, VolumeX, Play, Pause, Share2, MoreVertical } from 'lucide-react';
import { useParams } from "next/navigation";

export default function ReelsPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [showHeart, setShowHeart] = useState<{ [key: number]: boolean }>({});
  const [openCommentsPostId, setOpenCommentsPostId] = useState<number | null>(null);
  const lastTapRef = useRef<{ [key: number]: number }>({});
  const [muted, setMuted] = useState(true);
  const [starredUsers, setStarredUsers] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);
  
  const params = useParams();
  const reelId = Number(params.id);

  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRefs = useRef<Map<number, number>>(new Map());
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!reelId || reels.length === 0) return;
  
    const index = reels.findIndex(
      r => Number(r.id) === reelId
    );
  
    if (index === -1) return;
  
    setTimeout(() => {
      scrollToReel(index);
      setActiveId(reelId);
    }, 200);
  
  }, [reels, reelId]);

  // FETCH REELS
  const PAGE_SIZE = 5;

  const fetchInitialReels = async () => {
    try {
        const res = await apiRequest(
            `api/post/reels/?page=1&page_size=${PAGE_SIZE}`
        );

        const normalized = (res.results || []).map((r: any) => ({
            ...r,
            id: r.id ?? r.pk ?? r.post_id,
        }));

        setReels(normalized);

        setPage(1);

        setHasNext(!!res.next);

    } catch (err) {
        console.error(err);
    }
  };
  useEffect(() => {
    (async () => {
      const res = await apiRequest(
        'api/post/reels/?page=1&page_size=5'
      );
      console.log(res.results?.[0] || res[0]);
      const normalized = (res.results || res || [])
      .filter((r: any) => r.content_type === "short_video")
      .map((r: any) => ({
        ...r,
        id: r.id ?? r.pk ?? r.post_id,
      }));
      console.log(normalized[0]);
  
      if (reelId) {
        const clickedReel = normalized.find(
          (r: any) => Number(r.id) === reelId
        );
      
        if (clickedReel) {
          const others = normalized.filter(
            (r: any) => Number(r.id) !== reelId
          );
      
          setReels([
            clickedReel,
            ...others,
          ]);
      
          return;
        }
      }
  
      setReels(normalized);
    })();
  }, []);
  
  const loadMoreReels = async () => {
    if (loadingMore) return;
    if (loadingRef.current) return;

    loadingRef.current = true;

    if (!hasNext) return;

    setLoadingMore(true);

    try {

        const nextPage = page + 1;

        const res = await apiRequest(
            `api/post/reels/?page=${nextPage}&page_size=5`
        );

        const normalized = (res.results || []).map((r: any) => ({
            ...r,
            id: r.id ?? r.pk ?? r.post_id,
        }));

        setReels(prev => {

            const ids = new Set(prev.map(r => r.id));

            const fresh = normalized.filter(
                r => !ids.has(r.id)
            );

            return [...prev, ...fresh];

        });

        setPage(nextPage);

        setHasNext(Boolean(res.next));

    } catch (err) {

        console.error("Failed loading reels", err);

    } finally {

        setLoadingMore(false);
        loadingRef.current = false;

    }
  };
  
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
      if (!reel.is_liked) {
        handleLike(reel);
      }
    }
  
    lastTapRef.current[reel.id] = now;
  };
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("api/users/me/");
        setCurrentUser(res);
      } catch (err) {
        console.error("Failed to fetch current user", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await apiRequest("api/users/starred/");
      setStarredUsers(new Set(res.starred_users)); 
    })();
  }, []);

  const toggleStar = async (userId: number) => {
    if (!userId) return;

    try {
      const res = await apiRequest(
        `api/users/star/${userId}/toggle/`,
        { method: "POST" }
      );
  
      setStarredUsers(prev => {
        const copy = new Set(prev);
    
        if (res.starred) copy.add(userId);
        else copy.delete(userId);
    
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  };
  
  const toggleLikeUI = (id: number) => {
    setReels(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, is_liked: !r.is_liked }
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
              is_liked: !r.is_liked,
              likes_count: r.is_liked
                ? r.likes_count - 1
                : r.likes_count + 1,
            }
          : r
      )
    );
  
    try {
      const res = await apiRequest(`api/likes/${reel.id}/toggle/`, {
        method: "POST",
      });
  
      // optional sync correction
      setReels(prev =>
        prev.map(r =>
          r.id === reel.id
            ? {
                ...r,
                is_liked: res.liked,
                likes_count: res.likes_count,
              }
            : r
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      setMuted(e.detail);
    };
  
    window.addEventListener("toggle-reel-mute", handler);
  
    return () => {
      window.removeEventListener("toggle-reel-mute", handler);
    };
  }, []);

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
  
  useEffect(() => {
    if (openCommentsPostId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [openCommentsPostId]);

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

  const scrollToReel = (index: number) => {
    const video = videoRefs.current.get(reels[index]?.id);
    video?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleCopyLink = async (postId: number) => {
    try {
      const url = `${window.location.origin}/main/home/${postId}`;
      await navigator.clipboard.writeText(url);
      
      alert("Link copied!");
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };
  
  useEffect(() => {

    const currentIndex =
        reels.findIndex(
            r => r.id === activeId
        );

    if (
        currentIndex >= reels.length - 2
    ) {
        loadMoreReels();
    }

  }, [activeId]);
  
  const {
    canCommunicate,
    networkStatus,
    reconnecting,
    serverReachable,
    isOnline,
  } = useNetwork();

  const showSpinner =
    !canCommunicate ||
    buffering;
  
  const nextVideo =
    videoRefs.current.get(
        reels[currentIndex + 1]?.id
    );

  nextVideo?.load();

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-70px)] overflow-y-scroll snap-y snap-mandatory bg-black"
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
          currentUser={currentUser}
          videoRefs={videoRefs}
          progressRefs={progressRefs} 
          setOpenCommentsPostId={setOpenCommentsPostId}
          handleDoubleTap={handleDoubleTap}
          handleCopyLink={handleCopyLink}
          showHeart={showHeart}
          activeId={activeId}
        />
      ))}

      {openCommentsPostId && (
        <CommentsModal
          postId={openCommentsPostId}
          onClose={() => setOpenCommentsPostId(null)}
        />
      )}

      {showSpinner&& (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner/>
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
  currentUser,
  videoRefs,
  progressRefs,
  setOpenCommentsPostId,
  handleDoubleTap,
  handleCopyLink,
  showHeart,
  activeId,
}: any) {
  const progress = progressRefs.current.get(reel.id) || 0;
  const [showControls, setShowControls] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = reel.user?.id === currentUser?.id;
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [buffering,setBuffering]=useState(false);

  // VIEW TRACKING
  useSmartPostView({
    post: reel,
    ref: reelVideoRef,
    onViewed: async () => {
      const res = await apiRequest(`api/post/${reel.id}/view/`);
      
      setReels(prev =>
        prev.map(r =>
          r.id === reel.id
            ? { ...r, views_count: res.views_count }
            : r
        )
      );
    }
  });
  
  const handleMute = async () => {
    try {
      await apiRequest(
        `api/users/mute/${reel.user.id}/`,
        {
          method: "POST",
        }
      );
  
      alert("User muted");
      setMenuOpen(false);
  
    } catch (err) {
      console.error(err);
      alert("Failed to mute user");
    }
  };
  
  const handleBlock = async () => {
    if (!confirm(`Block @${reel.user.username}?`)) return;
  
    try {
      await apiRequest(
        `api/users/block/${reel.user.id}/`,
        {
          method: "POST",
        }
      );
  
      alert("User blocked");
  
      // Remove all reels from blocked user immediately
      setReels((prev: any[]) =>
        prev.filter(
          (item) => item.user.id !== reel.user.id
        )
      );
  
      setMenuOpen(false);
  
    } catch (err) {
      console.error(err);
      alert("Failed to block user");
    }
  };
  
  const handleReport = async () => {
    if (!reportReason) {
      alert("Please select a reason");
      return;
    }
  
    try {
      const res = await apiRequest(
        `api/post/${reel.id}/report/`,
        {
          method: "POST",
          data: {
            reason: reportReason,
            details: reportDetails,
          },
        }
      );
  
      alert(res.message);
  
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
  
    } catch (err: any) {
  
      alert(
        err?.data?.message ||
        "Failed to submit report"
      );
  
      console.error(err);
    }
  };

  const seekVideo = (seconds: number) => {
    const video = videoRefs.current.get(reel.id);
    if (!video) return;

    video.currentTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      video.duration || Infinity
    );
  };
  
  useEffect(() => {

    const resume = () => {
        const video =
            videoRefs.current.get(activeId);

        video?.play().catch(() => {});
    };

    window.addEventListener(
        "network-reconnected",
        resume
    );

    return () =>
        window.removeEventListener(
            "network-reconnected",
            resume
        );

  }, [activeId]);
  
  useEffect(() => {

    const index = reels.findIndex(
        r => r.id === activeId
    );
  
    if(index >= reels.length - 2){
  
      loadMoreReels();
  
    }

  }, [activeId]);
  
  const currentIndex =
    reels.findIndex(r => r.id === activeId);

  const reelIndex =
    reels.findIndex(r => r.id === reel.id);

  const preload =
      reelIndex === currentIndex
        ? "auto"
        : reelIndex === currentIndex + 1
        ? "metadata"
        : "none";

  return (
    <div
      id={`reel-${reel.id}`}
      onClick={() => {
        handleDoubleTap(reel);
        setShowControls(true);
      
        clearTimeout((window as any).__reelControlsTimeout);

        (window as any).__reelControlsTimeout = setTimeout(() => {
          setShowControls(false);
        }, 2500);
      }}
      className="h-full w-full snap-start relative"
    >

      {/* VIDEO */}
      <video
        data-id={reel.id}
        ref={(el) => {
          if (el) {
            el.muted = muted;
        
            reelVideoRef.current = el;
        
            videoRefs.current.set(reel.id, el);
          }
        }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
  
          progressRefs.current.set(
              reel.id,
              (video.currentTime / video.duration) * 100
          );
        }}
        onWaiting={()=>setBuffering(true)}
        onPlaying={()=>{
          setBuffering(false);
        }}
        onCanPlay={()=>{
          setBuffering(false);
          e.currentTarget.play().catch(() => {});
        }}
        onStalled={() => setBuffering(true)}
        onSuspend={() => setBuffering(true)}
        preload={preload}
        src={reel.media_files?.[0]?.file_url}
        className="h-full w-full object-cover"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/20" />

      {/* PROGRESS BAR */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white dark:bg-gray-700">
        <div
          className="h-1 bg-gray-700 dark:bg-white transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
  
      <button
        onClick={() => window.history.back()}
        className="text-3xl w-10 text-black flex dark:text-white items-center justify-center absolute top-4 left-3"
      >
        ←
        <span>Entertainment Reels</span>
      </button>

      {/* CENTER CONTROLS */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
      
          <div className="flex items-center gap-10">
      
            {/* BACKWARD */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                seekVideo(-10);
              }}
              className="bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm"
            >
              -10s
            </button>
      
            {/* PLAY / PAUSE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
      
                const video = videoRefs.current.get(reel.id);
                if (!video) return;
      
                if (video.paused) {
                  video.play();
                  setPlaying(true);
                } else {
                  video.pause();
                  setPlaying(false);
                }
              }}
              className="bg-black/60 p-4 rounded-full backdrop-blur-sm"
            >
              {playing ? (
                <Pause className="text-white w-8 h-8" />
              ) : (
                <Play className="text-white w-8 h-8" />
              )}
            </button>
      
            {/* FORWARD */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                seekVideo(10);
              }}
              className="bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm"
            >
              +10s
            </button>
      
          </div>
        </div>
      )}

      {/* ❤️ HEART ANIMATION */}
      {showHeart[reel.id] && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-[heartPop_0.7s_ease-out]" />
        </div>
      )}

      {/* RIGHT ACTIONS */}
      <div className="absolute right-3 bottom-24 flex items-center flex-col gap-6 text-white">

        {/* LIKE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike(reel);
          }}
          className={`flex flex-col items-center gap-1 font-medium ${
            reel.is_liked ? "text-red-600" : ""
          }`}
        >
          <Heart
            className={`w-7 h-7 ${
              reel.is_liked
                ? "fill-red-600"
                : ""
            }`}
          />
          {reel.likes_count > 0 && (
            <span className="text-xs">
              {reel.likes_count}
            </span>
          )}
        </button>

        {/* COMMENTS */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenCommentsPostId(reel.id);
          }}
          className="flex flex-col items-center"
        >
          <MessageCircle className="w-7 h-7" />
          {reel.comments_count > 0 && (
            <span className="text-xs">
              {reel.comments_count}
            </span>
          )}
        </button>

        {/* VIEWS */}
        <button className="flex flex-col items-center">
          <Eye className="w-7 h-7" />
          {reel.views_count > 0 && (
            <span className="text-xs">
              {reel.views_count}
            </span>
          )}
        </button>

        {/* SHARE */}
        <ShareButton
          post={reel}
          vertical
          dark
        />

        {/* MUTE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
        
            const newMuted = !muted;
        
            videoRefs.current.forEach((v) => {
              if (v) v.muted = newMuted;
            });
        
            window.dispatchEvent(
              new CustomEvent("toggle-reel-mute", {
                detail: newMuted,
              })
            );
          }}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </button>

      </div>

      {/* CAPTION + USER */}
      <div className="absolute bottom-3 left-4 right-4 text-white z-20">
      
        <div className="flex items-start justify-between w-full">
      
          <div className="flex items-center min-w-0">
      
            <p className="font-bold truncate mr-2">
              @{reel.user.username}
            </p>
      
            {reel.user?.id && reel.user.id !== currentUser?.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(reel.user.id);
                }}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${
                  starredUsers.has(reel.user.id)
                    ? " text-black"
                    : "bg-white text-black"
                }`}
              >
                {starredUsers.has(reel.user.id)
                  ? "⭐ "
                  : "⭐ Star"}
              </button>
            )}
      
          </div>
        </div>
  
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(prev => !prev);
          }}
          className="absolute right-1 bottom-10 text-white z-30"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      
        <div className="mt-2 max-w-[70%]">
          <p
            className={`text-sm ${
              captionExpanded ? "" : "line-clamp-1"
            }`}
          >
            {reel.caption}
          </p>
        
          {reel.caption?.length > 60 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCaptionExpanded(prev => !prev);
              }}
              className="text-xs text-gray-300 mt-1"
            >
              {captionExpanded ? "less" : "more"}
            </button>
          )}
        </div>
      
      </div>

      {menuOpen && (
        <div className="absolute right-3 bottom-14 bg-white dark:bg-gray-800 border rounded-xl shadow-lg z-50 overflow-hidden">
          
          <div className="flex flex-col">
      
            {!isOwner && (
              <>
                <button className="px-3 py-2 text-left text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Report
                </button>
    
                <button onClick={handleMute} className="px-3 py-2 text-left text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Mute User
                </button>
                
                <button onClick={handleBlock} className="px-3 py-2 text-left text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Block User
                </button>
              </>
            )}
      
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink(reel.id);
                setMenuOpen(false);
              }}
              className="text-left px-3 py-2 text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700"
            >
              Copy link
            </button>
      
            {isOwner && (
              <button className="px-3 py-2 text-left text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                Delete
              </button>
            )}

            {isOwner && (
              <button className="px-3 py-2 text-left text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                Edit
              </button>
            )}
      
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              className="px-3 py-2 text-left text-sm bg-gray-100 dark:bg-gray-700"
            >
              Close
            </button>
      
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-200 dark:bg-gray-900 p-4 rounded-xl w-[90%] max-w-md">
            
            <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Report Post</h2>
      
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full border p-2 rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-800 mb-3 bg-gray-100"
            >
              <option value="">Select reason</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="violence">Violence</option>
              <option value="nudity">Nudity</option>
              <option value="misinformation">Misinformation</option>
              <option value="copyright">Copyright</option>
              <option value="other">Other</option>
            </select>
            
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="w-full border p-2 rounded-md dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              rows={4}
              placeholder="Additional details (optional)"
            />
      
            <div className="flex justify-end text-gray-900 dark:text-gray-200 gap-2 mt-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setReportOpen(false);
                }}>
                Cancel
              </button>
      
              <button
                onClick={handleReport}
                className="bg-red-600 text-white px-3 py-1 rounded-md"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}