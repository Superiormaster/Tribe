'use client';

import {
    useEffect,
    useRef,
    useState,
} from "react";
import { apiRequest } from '@/utils/api';
import { useReelBuffer } from '@/reelsHook/useReelBuffer';

type Reel = {
  id: number;
  pk?: number;
  post_id?: number;
  content_type?: string;
  [key: string]: any;
};

export function useReels(reelId?: number) {
  const PAGE_SIZE = 5;

  const [reels, setReels] = useState<Reel[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const clickedReelId = reelId;
  const {
    isOnline,
  } = useReelBuffer();
  
  const [starredUsers, setStarredUsers] =
      useState<Set<number>>(new Set());
  
  const [
      openCommentsPostId,
      setOpenCommentsPostId,
  ] = useState<number | null>(null);
  
  const loadingRef = useRef(false);
  
  const fetchCurrentUser = async () => {
    try {
        const res = await apiRequest(
            "api/users/me/"
        );

        setCurrentUser(res);
    } catch (err) {
        console.error(err);
    }
  };
  
  const fetchStarred = async () => {
    try {
        const res = await apiRequest(
            "api/users/starred/"
        );

        setStarredUsers(
            new Set(res.starred_users)
        );
    } catch (err) {
        console.error(err);
    }
  };
  
  const fetchInitialReels = async () => {
    setLoading(true);

    try {

        const res = await apiRequest(
            `api/post/reels/?page=1&page_size=${PAGE_SIZE}`
        );

        const normalized: Reel[] =
          (res.results || [])
              .filter((r: Reel) => r.content_type === "short_video")
              .map((r: Reel) => ({
                  ...r,
                  id: r.id ?? r.pk ?? r.post_id,
              }));

        if (clickedReelId) {
            const clicked =
                normalized.find(
                    (r: Reel) =>
                        Number(r.id) ===
                        clickedReelId
                );

            if (clicked) {
                const others =
                    normalized.filter(
                        (r: Reel) =>
                            Number(r.id)!==
                            clickedReelId
                    );

                setReels([
                    clicked,
                    ...others,
                ]);

            } else {
                setReels(normalized);
            }
        } else {
            setReels(normalized);
        }

        setPage(1);
        setHasNext(Boolean(res.next));

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };
  
  const loadMore = async () => {
    if (!isOnline) return;
    if (loadingRef.current) return;
    if (!hasNext) return;

    loadingRef.current = true;
    setLoadingMore(true);

    try {
        const nextPage = page + 1;

        const res = await apiRequest(
            `api/post/reels/?page=${nextPage}&page_size=${PAGE_SIZE}`
        );

        const normalized: Reel[] = (res.results || []).map((r: Reel) => ({
            ...r,
            id: r.id ?? r.pk ?? r.post_id,
        }));

        // No more results
        if (normalized.length === 0) {
            setHasNext(false);
            return;
        }

        setReels((prev: Reel[]) => {
            const ids = new Set(prev.map((r: Reel) => r.id));
            const fresh = normalized.filter((r: Reel) => !ids.has(r.id));
            return [...prev, ...fresh];
        });

        setPage(nextPage);
        setHasNext(Boolean(res.next));

    } catch (err: any) {
        // Stop requesting if page doesn't exist
        if (err?.status === 404 || err?.response?.status === 404) {
            setHasNext(false);
        }

        console.error(err);
    } finally {
        loadingRef.current = false;
        setLoadingMore(false);
    }
  };
  
  const handleLike = async (
    reel:any
  ) => {
    if (!reel?.id) return;

    setReels(prev=>
        prev.map(r=>
            r.id===reel.id
            ?{
                ...r,
                is_liked:
                    !r.is_liked,

                likes_count:
                    r.is_liked
                    ? r.likes_count-1
                    : r.likes_count+1,
            }
            :r
        )
    );

    try{
        const res =
            await apiRequest(
                `api/likes/${reel.id}/toggle/`,
                {
                    method:"POST",
                }
            );

        setReels(prev=>
            prev.map(r=>
                r.id===reel.id
                ?{
                    ...r,
                    is_liked:
                        res.liked,
                    likes_count:
                        res.likes_count,
                }
                :r
            )
        );
    }catch(err){
        console.error(err);
    }
  };
  
  const toggleStar = async (
    userId:number
  )=>{
    if(!userId) return;

    try{
        const res =
            await apiRequest(
                `api/users/star/${userId}/toggle/`,
                {
                    method:"POST",
                }
            );

        setStarredUsers(prev=>{
            const copy =
                new Set(prev);

            if(res.starred)
                copy.add(userId);
            else
                copy.delete(userId);
            return copy;
        });
    }catch(err){
        console.error(err);
    }
  };
  
  const handleMute = async (
    userId:number
  )=>{

    await apiRequest(
        `api/users/mute/${userId}/`,
        {
            method:"POST",
        }
    );
  
    alert("User muted");
  };
  
  const handleBlock = async (
    userId: number, 
    username: string
  )=>{
    if (!confirm(`Block @${username}?`)) return;

    await apiRequest(
        `api/users/block/${userId}/`,
        {
            method:"POST",
        }
    );
  
    alert("User blocked");

    setReels(prev=>
        prev.filter(
            item=>
                item.user.id!==userId
        )
    );
  };
  
  const handleReport = async (
      reelId:number,
      reason:string,
      details:string
  )=>{
      const res = await apiRequest(
          `api/post/${reelId}/report/`,
          {
              method:"POST",
              data:{
                  reason,
                  details,
              },
          }
      );
  
      return res;
  };
  
  useEffect(()=>{
      fetchInitialReels();
      fetchCurrentUser();
      fetchStarred();
  },[]);
  
  const handleCopyLink = async (
    postId:number
  )=>{
    const url =
        `${window.location.origin}/main/home/${postId}`;

    await navigator.clipboard.writeText(url);
    alert("Copied");
  };
  
  const handleDelete = async (
    postId:number
  )=>{

    await apiRequest(
        `api/post/${postId}/`,
        {
            method:"DELETE",
        }
    );

    setReels(prev=>
        prev.filter(
            r=>r.id!==postId
        )
    );
  };
  
  const handleEdit = async (
    postId:number,
    data:any
  )=>{

    const res =
        await apiRequest(
            `api/post/${postId}/`,
            {
                method:"PATCH",
                data,
            }
        );

    setReels(prev=>
        prev.map(r=>
            r.id===postId
                ?{
                    ...r,
                    ...res,
                }
                :r
        )
    );

    return res;
  };
  
  return {
      reels,
      setReels,
      loading,
      loadingMore,
      currentUser,
      starredUsers,
      openCommentsPostId,
      setOpenCommentsPostId,
  
      handleLike,
      toggleStar,
      handleReport,
      handleMute,
      handleBlock,
      handleDelete,
      handleEdit,
      handleCopyLink,
  
      loadMore,
  };
}