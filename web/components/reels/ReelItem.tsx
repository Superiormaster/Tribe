'use client';

import { useRef, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import ReelSpinner from "@/components/Spinner";
import { useSmartPostView } from "@/lib/useSmartPostView";
import ReelActions from "./ReelActions";
import ReelControls from "./ReelControls";
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import ReelSkeleton from "./ReelSkeleton";
import ReelCaption from "./ReelCaption";
import ReelMenu from "./ReelMenu";
import ReelReportModal from "./ReelReportModal";
import { usePostSocket } from "@/hooks/usePostSocket"
import { useNavigation } from "@/utils/useNavigation"
import { useDoubleTapLike } from '@/reelsHook/useDoubleTapLike';
import { useReelBuffer } from '@/reelsHook/useReelBuffer';

interface ReelItemProps {
  reel: any;
  player: any;
  reelsState: any;
  index: number;
  reels: any[];
}

export default function ReelItem({
  reel,
  player,
  reelsState,
  index,
  reels,
}: ReelItemProps) {
  const [progress, setProgress] = useState(0);
  const { back } = useNavigation();
  const loaded = player.loadedVideos.current.has(reel.id);
  const {
    isOnline,
    serverReachable,
  } = useNetwork();
  const {
    showHeart,
    handleDoubleTap,
  } = useDoubleTapLike({
    handleLike: reelsState.handleLike,
  });
  
  const {
    buffering,
    setBuffering,
    showSpinner,
  } = useReelBuffer();
  
  const reelVideoRef=
    useRef<HTMLVideoElement>(null);
  
  useSmartPostView({
    post: reel,
    ref: reelVideoRef,
    onViewed: (views) => {

        reelsState.setReels((prev: any) =>
            prev.map((r: any) =>
                r.id === reel.id
                    ? {
                          ...r,
                          views_count: views,
                      }
                    : r
            )
        );
    },
  });
  
  usePostSocket({
    postId: reel.id,
  
    onStats: (data) => {
      reelsState.setReels((prev: any[]) =>
        prev.map((r: any) =>
          r.id === data.post_id
            ? {
                ...r,
                likes_count: data.likes_count,
                comments_count: data.comments_count,
                shares_count: data.shares_count,
                views_count: data.views_count,
              }
            : r
        )
      );
    },
  
    onNewComment: (data) => {
      reelsState.setReels((prev: any[]) =>
        prev.map((r: any) =>
          r.id === data.post_id
            ? {
                ...r,
                comments_count: data.comments_count,
              }
            : r
        )
      );
    },
  
    onCommentDeleted: (data) => {
      reelsState.setReels((prev: any[]) =>
        prev.map((r: any) =>
          r.id === data.post_id
            ? {
                ...r,
                comments_count: data.comments_count,
              }
            : r
        )
      );
    },
  });
  
  const [playing,setPlaying]=useState(true);
  
  const [showControls,setShowControls]=useState(false);
  
  const [menuOpen,setMenuOpen]=useState(false);
  
  const [reportOpen,setReportOpen]=useState(false);
  
  const isOwner=
    reel.user.id===reelsState.currentUser?.id;

  const currentIndex =
    reels.findIndex(r => r.id === player.activeId);

  const reelIndex =
    reels.findIndex(r => r.id === reel.id);

  const preload =
      reelIndex === currentIndex
        ? "auto"
        : reelIndex === currentIndex + 1
        ? "metadata"
        : "none";
  
  useEffect(() => {
    const video = reelVideoRef.current;
  
    if (!video) return;
  
    const isActive = player.activeId === reel.id;
  
    if (isActive) {
      video.muted = player.muted;
  
      video.play().catch(() => {});
    } else {
      video.pause();
  
      if (isOnline) {
        video.currentTime = 0;
      }
  
      video.muted = true;
    }
  }, [player.activeId, player.muted, reel.id]);

  return (
    <div
      id={`reel-${reel.id}`}
      className="
            relative
            h-dvh
            w-full
            snap-start
            overflow-hidden
            bg-black
            flex-shrink-0
        "
      onClick={() => {
        handleDoubleTap(reel);
    
        setShowControls(true);
    
        clearTimeout(
          (window as any).__reelControlsTimeout
        );
    
        (window as any).__reelControlsTimeout =
          setTimeout(() => {
            setShowControls(false);
          }, 2500);
      }}
    >
      <video
        className="absolute inset-0 w-full h-full pointer-events-none object-cover"
        ref={(el)=>{
            if(!el) return;
      
            reelVideoRef.current=el;
      
            player.videoRefs.current.set(
                reel.id,
                el
            );
      
            el.muted=player.muted;
        }}
      
        data-id={reel.id}
        src={reel.media_files?.[0]?.file_url}
        loop
        playsInline
        preload={preload}
      
        onPlay={()=>setPlaying(true)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={(e) => {
          player.loadedVideos.current.add(reel.id);
        
          setBuffering(false);
        
          if (player.activeId === reel.id) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        onStalled={() => setBuffering(true)}
        onSuspend={() => setBuffering(true)}
        onPause={()=>setPlaying(false)}
      
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
        
          const value =
              video.duration > 0
                  ? (video.currentTime / video.duration) * 100
                  : 0;
        
          player.progressRefs.current.set(
              reel.id,
              value
          );
        
          setProgress(value);
        }}
      />

      {!loaded && (
        <ReelSkeleton/>
      )}

      <ReelActions
        reel={reel}
        muted={player.muted}
        videoRefs={player.videoRefs}
        handleBookmark={reelsState.handleBookmark}
        handleLike={reelsState.handleLike}
        setOpenCommentsPostId={reelsState.setOpenCommentsPostId}
        onMenuClick={()=>
            setMenuOpen(true)
        }
      />
      <ReelControls
        show={showControls}
        video={
            player.videoRefs.current.get(
                reel.id
            )
        }
        playing={playing}
        setPlaying={setPlaying}
      />
      <ReelReportModal
        open={reportOpen}
        onClose={()=>
            setReportOpen(false)
        }
        onSubmit={(reason,details)=>
            reelsState.handleReport(
                reel.id,
                reason,
                details
            )
        }
      />
    
      <ReelCaption
        reel={reel}
        currentUser={
            reelsState.currentUser
        }
        starredUsers={
            reelsState.starredUsers
        }
        toggleStar={
            reelsState.toggleStar
        }
      />
      <ReelMenu
        open={menuOpen}
        isOwner={isOwner}
        reelId={reel.id}
        username={reel.user.username}
        onClose={()=>setMenuOpen(false)}
        onReport={()=>{
            setMenuOpen(false);
            setReportOpen(true);
        }}
        onMute={()=>
            reelsState.handleMute(
                reel.user.id
            )
        }
        onBlock={()=> {
            reelsState.handleBlock(
                reel.user.id,
                reel.user.username
            );
        }}
        onDelete={()=>
            reelsState.handleDelete(
                reel.id
            )
        }
        onEdit={()=>
            reelsState.handleEdit(
                reel.id
            )
        }
      />
    
      {/* PROGRESS BAR */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30 z-40">
        <div
            className="h-full bg-white transition-all duration-75"
            style={{ width: `${progress}%` }}
        />
      </div>
  
      <button
        onClick={(e) => {
            e.stopPropagation();
            back();
        }}
        className="
            fixed
            top-4
            left-3
            z-50
            flex
            items-center
            gap-2
            text-white
            bg-black/40
            backdrop-blur-md
            rounded-full
            px-3
            py-2
        "
      >
        <span className="text-2xl">←</span>
    
        <span className="text-sm font-medium">
            Entertainment Reels
        </span>
      </button>
    
      {showHeart[reel.id] && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart
            className="w-20 h-20 text-red-500 fill-red-500 animate-[heartPop_0.7s_ease-out]"
          />
        </div>
      )}
      
      {!loaded && showSpinner && isOnline && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ReelSpinner show={showSpinner} />
        </div>
      )}
    </div>
  );
}