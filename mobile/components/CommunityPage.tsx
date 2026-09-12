'use client';

import { useEffect, useState, useMemo, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { useFeedSocket } from '@/lib/useFeedSocket';
import CommunityHeader from "@/components/community/CommunityHeader";
import CommunityTabs from "@/components/community/CommunityTabs";
import CommunityPosts from "@/components/community/CommunityPosts";
import CommunityPending from "@/components/community/CommunityPending";
import CommunityMembers from "@/components/community/CommunityMembers";
import CommunityMenuModal from "@/components/community/CommunityMenuModal";
import ModerationBar from "@/components/community/ModerationBar";
import toast from 'react-hot-toast';

import {
  POST_DELETED_EVENT,
  REPOST_DELETED_EVENT,
  SHARE_DELETED_EVENT,
} from "@/lib/postEvents";
import {
  removePostFromState,
} from "@/lib/removePostFromState";
import { apiRequest } from "@/utils/api";
import { deletePostEverywhere } from '@/utils/deletePost';

type Post = {
  id: number;
  community_pinned?: boolean
  community_pin_order?: number | null
};

type PendingItem = {
  type: "post" | "share";
  id: number;
};

export default function CommunityPage({
  communityId,
  user,
}: any) {

  const { push, replace } = useNavigation();

  const [community, setCommunity] = useState<any>({});
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  const [pageCount, setPageCount] = useState(1);
  const [showRefresh, setShowRefresh] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [activeTab, setActiveTab] = useState("posts");

  const [showMenuModal, setShowMenuModal] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<PendingItem[]>([]);
  const { mutedUserIds, blockedUserIds } =
    useContext(UserContext)!;
  const [starredUsers, setStarredUsers] =
    useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);
  const [suggestedCommunities, setSuggestedCommunities] = useState<any[]>([]);
  
  const isOwner =
  Number(user?.id) === Number(community?.owner?.id) ||
  community?.my_role === "owner";

  const isAdmin = community?.my_role === "admin";
  const isModerator = community?.my_role === "moderator";

  // 🔥 MASTER ROLE FLAGS
  const canModerate = isOwner || isAdmin || isModerator;
  const canManage = isAdmin || isModerator || isOwner;
  const canPin = isAdmin || isOwner || isModerator;
  const canApprovePosts = isOwner || isAdmin || isModerator;
  
  // ❌ ONLY OWNER CAN SEE SETTINGS
  const canSeeSettings = isOwner;
  const canDeleteRejected = canManage;

  const canDeleteApproved =
  isOwner || isAdmin;
  const canEditApproved =
  isOwner || isAdmin;

  const canBulkModerate = canManage;
  
  // ❌ ONLY NON-OWNER CAN LEAVE
  const canLeave =
  !isOwner &&
  community?.joined === true;
  
  useEffect(() => {
    fetchCommunity();
    fetchPosts();
    fetchPendingPosts();
    fetchMembers();
    fetchSuggested();
  }, []);
  
  useEffect(() => {

    const handlePostDeleted = (event: Event) => {
      const customEvent =
        event as CustomEvent<{
          postId: number;
        }>;
  
      const deletedPostId =
        Number(customEvent.detail?.postId);
  
      if (!deletedPostId) return;
  
      setPosts(prev =>
        removePostFromState(
          prev,
          deletedPostId
        )
      );
    };
  
    const handleRepostDeleted = (event: Event) => {
      const customEvent =
        event as CustomEvent<{
          repostId: number;
        }>;
  
      const repostId =
        Number(
          customEvent.detail?.repostId
        );
  
      if (!repostId) return;
  
      setPosts(prev =>
        prev.filter(
          (post: any) => {
            const isRepost =
              post.type === "repost" ||
              post.feed_type === "repost";
  
            if (!isRepost) {
              return true;
            }
  
            return Number(post.id) !== repostId;
          }
        )
      );
    };
  
  
    const handleShareDeleted = (event: Event) => {
      const customEvent =
        event as CustomEvent<{
          shareId: number;
        }>;
  
      const shareId =
        Number(
          customEvent.detail?.shareId
        );
  
      if (!shareId) return;
  
      setPosts(prev =>
        prev.filter(
          (post: any) => {
            const isShare =
              post.type === "share" ||
              post.feed_type === "share";
  
            if (!isShare) {
              return true;
            }
  
            return Number(post.id) !== shareId;
          }
        )
      );
    };
  
  
    window.addEventListener(
      POST_DELETED_EVENT,
      handlePostDeleted
    );
  
    window.addEventListener(
      REPOST_DELETED_EVENT,
      handleRepostDeleted
    );
  
    window.addEventListener(
      SHARE_DELETED_EVENT,
      handleShareDeleted
    );
  
  
    return () => {
  
      window.removeEventListener(
        POST_DELETED_EVENT,
        handlePostDeleted
      );
  
      window.removeEventListener(
        REPOST_DELETED_EVENT,
        handleRepostDeleted
      );
  
      window.removeEventListener(
        SHARE_DELETED_EVENT,
        handleShareDeleted
      );
  
    };
  
  }, []);
  
  const handleFeedPostStats = (
    postId: number,
    data: any
  ) => {
  
    setPosts(prev =>
      prev.map((item: any) => {
  
        if (
          Number(item.id) === Number(postId)
        ) {
          return {
            ...item,
            likes_count:
              data.likes_count ??
              item.likes_count,
  
            comments_count:
              data.comments_count ??
              item.comments_count,
  
            shares_count:
              data.shares_count ??
              item.shares_count,
  
            views_count:
              data.views_count ??
              item.views_count,
          };
        }
  
        // repost
        if (
          item.type === "repost" ||
          item.feed_type === "repost"
        ) {
  
          const originalPostId = Number(
            item.post?.id ??
            item.data?.post?.id ??
            item.post_id
          );
  
          if (
            originalPostId === Number(postId)
          ) {
  
            return {
              ...item,
  
              post: {
                ...item.post,
  
                likes_count:
                  data.likes_count ??
                  item.post.likes_count,
  
                comments_count:
                  data.comments_count ??
                  item.post.comments_count,
  
                shares_count:
                  data.shares_count ??
                  item.post.shares_count,
  
                views_count:
                  data.views_count ??
                  item.post.views_count,
              },
            };
          }
        }
  
        // share
        if (
          item.type === "share" ||
          item.feed_type === "share"
        ) {
  
          const originalPostId = Number(
            item.post?.id ??
            item.data?.post?.id ??
            item.post_id
          );
  
          if (
            originalPostId === Number(postId)
          ) {
  
            return {
              ...item,
  
              post: {
                ...item.post,
  
                likes_count:
                  data.likes_count ??
                  item.post.likes_count,
  
                comments_count:
                  data.comments_count ??
                  item.post.comments_count,
  
                shares_count:
                  data.shares_count ??
                  item.post.shares_count,
  
                views_count:
                  data.views_count ??
                  item.post.views_count,
              },
            };
          }
        }
  
        return item;
      })
    );
  };
  
  useFeedSocket({
    type: 'community',
    communityId: Number(communityId),
  
    onStats: (data) => {
      handleFeedPostStats(
        data.post_id,
        data
      );
    },
  
    onNewComment: (data) => {
      handleFeedPostStats(
        data.post_id,
        {
          comments_count:
            data.comments_count,
        }
      );
    },
  
    onCommentDeleted: (data) => {
      handleFeedPostStats(
        data.post_id,
        {
          comments_count:
            data.comments_count,
        }
      );
    },
  
    onCommentUpdated: () => {},
  });

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const fetchCommunity = async () => {
    const data = await apiRequest(
      `api/communities/${communityId}/`
    );

    setCommunity(data);
  };
  
  const fetchSuggested = async () => {
    const data = await apiRequest(
      `api/communities/${communityId}/suggested/`
    );
  
    setSuggestedCommunities(data || []);
  };
  
  const mapCommunityPost = (item: any) => {

    // SHARE
    if (item.type === "share") {
      return {
        ...item,
        type: "share",
        created_at: item.created_at,
        community_pinned:
          item.community_pinned || false,
        community_pin_order:
          item.community_pin_order || 0,
        post: item.post
          ? {
              ...item.post,
              likes_count:
                item.post.likes_count || 0,
              comments_count:
                item.post.comments_count || 0,
              shares_count:
                item.post.shares_count || 0,
              media_files:
                item.post.media_files || [],
            }
          : null,
      };
    }
  
    // REPOST
    if (item.type === "repost") {
      return {
        ...item,
        type: "repost",
        created_at: item.created_at,
        community_pinned:
          item.community_pinned || false,
        community_pin_order:
          item.community_pin_order || 0,
  
        post: item.post
          ? {
              ...item.post,
              likes_count:
                item.post.likes_count || 0,
              comments_count:
                item.post.comments_count || 0,
              shares_count:
                item.post.shares_count || 0,
              media_files:
                item.post.media_files || [],
            }
          : null,
      };
    }
  
    return {
      ...item,
      type: "post",
      community_pinned:
        item.community_pinned || false,
      community_pin_order:
        item.community_pin_order || 0,
      likes_count:
        item.likes_count || 0,
      comments_count:
        item.comments_count || 0,
      shares_count:
        item.shares_count || 0,
      media_files:
        item.media_files || [],
    };
  };

  const fetchPosts = async () => {
    setLoading(true);
  
    try {
      // COMMUNITY FEED
      const data = await apiRequest(
        `api/communities/${communityId}/feed/`
      );
  
      const results = data.results || data;

      const mapped = results.map(mapCommunityPost);

      setPosts(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const refreshFeed = async () => {
    try {
  
      await apiRequest(
        `api/communities/${communityId}/refresh_feed/`,
        {
          method: "POST",
        }
      );
  
      setPageCount(1);
      setShowRefresh(false);
  
      fetchPosts();
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const loadMore = async () => {
    if (!hasMore) return;
  
    try {
      const nextPage = pageCount + 1;
  
      const data = await apiRequest(
        `api/communities/${communityId}/feed/?page=${nextPage}`
      );
  
      const newPosts = (data.results || [])
        .map(mapCommunityPost);
  
      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }
  
      setPosts(prev => [
        ...prev,
        ...newPosts,
      ]);
  
      setPageCount(nextPage);
  
      if (nextPage >= 5) {
        setShowRefresh(true);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      // page doesn't exist
      setHasMore(false);
    }
  };
  
  const showSuggestions =
    suggestedCommunities.length > 0 &&
    suggestedCommunities.some(c => !c.joined);

  const fetchPendingPosts = async () => {
    const data = await apiRequest(
      `api/communities/${communityId}/pending_posts/`
    );
  
    console.log("RAW PENDING RESPONSE:", data);
  
    setPendingPosts(data.results || data);
  };

  const fetchMembers = async () => {
    const data = await apiRequest(
      `api/communities/${communityId}/members/`
    );
  
    setMembers(data);
  };
  
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
      case "delete":

        try {
      
          await deletePostEverywhere(postId);
      
          setPosts(prev =>
            prev.filter((post: any) => {
      
              if (post.id === postId) {
                return false;
              }
      
              if (
                post.type === "repost" &&
                (
                  post.post?.id === postId ||
                  post.post_id === postId
                )
              ) {
                return false;
              }
      
              return true;
            })
          );
      
          toast.success("Post deleted");
      
        } catch (err) {
          console.error(err);
        }
      
        break;
  
      case "delete_share":
        try {
          await deletePostEverywhere(
            postId,
            "share"
          );
      
          setPosts(prev =>
            prev.filter(
              (post: any) =>
                Number(post.id) !== Number(postId)
            )
          );
      
          toast.success("Share deleted");
      
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete share");
        }
      
        break;
  
      // NORMAL REPOST
      case 'repost_normal':
  
        try {
  
          await apiRequest(
            `api/posts/${postId}/repost/`,
            {
              method: 'POST',
              data: {
                type: 'normal',
              },
            }
          );
  
          toast.success("Reposted!");
  
        } catch (err) {
  
          console.error(err);
        }
  
        break;
  
      // QUOTE REPOST
      case 'repost_quote':
  
        push(`/main/repost/${postId}`);
  
        break;
  
      case "delete_repost":
        try {
          await deletePostEverywhere(
            postId,
            "repost"
          );
      
          setPosts(prev =>
            prev.filter(
              (post: any) =>
                Number(post.id) !== Number(postId)
            )
          );
      
          toast.success("Repost deleted");
      
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete repost");
        }
      
        break;

      default:
        break;
    }
  };
  
  const visiblePosts = useMemo(() => {
    return posts.filter((post: any) => {
      const postUserId =
        post.type === "repost" || post.type === "share"
          ? post.post?.user?.id
          : post.user?.id;
  
      if (!postUserId) return true;
  
      return (
        !mutedUserIds.has(Number(postUserId)) &&
        !blockedUserIds.has(Number(postUserId))
      );
    });
  }, [posts, mutedUserIds, blockedUserIds]);

  const toggleSelect = (
    item: PendingItem
  ) => {
  
    setSelectedPosts(prev => {
  
      const exists = prev.some(
        selected =>
          selected.type === item.type &&
          Number(selected.id) === Number(item.id)
      );
  
      if (exists) {
        return prev.filter(
          selected =>
            !(
              selected.type === item.type &&
              Number(selected.id) === Number(item.id)
            )
        );
      }
  
      return [
        ...prev,
        item,
      ];
    });
  };
  
  const applyJoinStatus = (status: string) => {
    if (
      status === "joined" ||
      status === "already_joined"
    ) {
      setCommunity((prev: any) => ({
        ...prev,
        joined: true,
        requested: false,
        invited: false,
      }));
      return;
    }
  
    if (
      status === "requested" ||
      status === "already_requested"
    ) {
      setCommunity((prev: any) => ({
        ...prev,
        joined: false,
        requested: true,
        invited: false,
      }));
      return;
    }
  
    // 🔥 INVITED = BLOCK STATE
    if (status === "invited") {
      setCommunity((prev: any) => ({
        ...prev,
        joined: false,
        requested: false,
        invited: true,
      }));
      return;
    }
  };
  
  const handleJoinCommunity = async (communityId: number) => {
    const previousSuggested = [...suggestedCommunities];
  
    // 🔥 OPTIMISTIC UPDATE (like TribePage)
    setSuggestedCommunities((prev: any) =>
      prev.map((c: any) => {
        if (c.id !== communityId) return c;
  
        return {
          ...c,
          joined: true,
          requested: false,
        };
      })
    );
  
    try {
      const response = await apiRequest(
        `api/communities/${communityId}/join/`,
        { method: "POST" }
      );
  
      console.log("JOIN RESPONSE", response);
  
      applyJoinStatus(response.status);
  
    } catch (err) {
      console.error(err);
  
      // rollback
      setSuggestedCommunities(previousSuggested);
    }
  };
  
  const onJoin = async () => {
    const previousCommunity = { ...community };
  
    // optimistic update
    setCommunity((prev: any) => ({
      ...prev,
      joined: true,
      requested: false,
      invited: false,
    }));
  
    try {
      const response = await apiRequest(
        `api/communities/${communityId}/join/`,
        {
          method: "POST",
        }
      );
  
      applyJoinStatus(response.status);
    } catch (err) {
      console.error(err);
      // rollback
      setCommunity(previousCommunity);
    }
  };
  
  const handleLeave = async () => {
    const previous = community;

    setCommunity((prev: any) => ({
      ...prev,
      joined: false,
      requested: false,
    }));
  
    try {
      await apiRequest(`api/communities/${communityId}/leave/`, {
        method: "POST",
      });
      if (community?.tribe?.id) {
        replace(`/main/tribe/${community.tribe.id}`);
      } else {
        replace(`/main/community/${community.id}`);
      }
    } catch (err) {
      setCommunity(previous);
      console.error(err);
    }
  };
  
  const handleToggleCommunityPin = async (postId: number) => {
    const previousPosts = [...posts]
  
    const updated = (post: any) =>
      post.id === postId
        ? { ...post, community_pinned: !post.community_pinned }
        : post;
  
    setPosts(prev => prev.map(updated));
  
    try {
      await apiRequest(
        `api/post/${postId}/toggle_community_pin/`,
        {
          method: "POST"
        }
      )

       fetchPosts();
    } catch (err) {
      setPosts(previousPosts);
      console.error(err)
    }
  }

  const handleModeration = async (
    action: "approve" | "reject",
    items?: PendingItem[]
  ) => {
  
    const targetItemimport React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { UserContext } from "@/components/UserContext";
import { useNavigation } from "@/utils/useNavigation";
import { useFeedSocket } from "@/lib/useFeedSocket";

import CommunityHeader from "@/components/community/CommunityHeader";
import CommunityTabs from "@/components/community/CommunityTabs";
import CommunityPosts from "@/components/community/CommunityPosts";
import CommunityPending from "@/components/community/CommunityPending";
import CommunityMembers from "@/components/community/CommunityMembers";
import CommunityMenuModal from "@/components/community/CommunityMenuModal";
import ModerationBar from "@/components/community/ModerationBar";

import {
  POST_DELETED_EVENT,
  REPOST_DELETED_EVENT,
  SHARE_DELETED_EVENT,
} from "@/lib/postEvents";

import {
  removePostFromState,
} from "@/lib/removePostFromState";

import { apiRequest } from "@/utils/api";
import { deletePostEverywhere } from "@/utils/deletePost";

import { DeviceEventEmitter } from "react-native";

type Post = {
  id: number;
  community_pinned?: boolean;
  community_pin_order?: number | null;
};

type PendingItem = {
  type: "post" | "share";
  id: number;
};

type Props = {
  communityId: string;
  user: any;
};

export default function CommunityPage({
  communityId,
  user,
}: Props) {
  const { push, replace } = useNavigation();

  const [community, setCommunity] =
    useState<any>({});

  const [actionType, setActionType] =
    useState<"approve" | "reject" | null>(null);

  const [posts, setPosts] =
    useState<any[]>([]);

  const [pendingPosts, setPendingPosts] =
    useState<any[]>([]);

  const [members, setMembers] =
    useState<any[]>([]);

  const [pageCount, setPageCount] =
    useState(1);

  const [showRefresh, setShowRefresh] =
    useState(false);

  const [hasMore, setHasMore] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState("posts");

  const [showMenuModal, setShowMenuModal] =
    useState(false);

  const [selectMode, setSelectMode] =
    useState(false);

  const [selectedPosts, setSelectedPosts] =
    useState<PendingItem[]>([]);

  const {
    mutedUserIds,
    blockedUserIds,
  } = useContext(UserContext)!;

  const [starredUsers, setStarredUsers] =
    useState<Set<number>>(new Set());

  const [loading, setLoading] =
    useState(false);

  const [
    suggestedCommunities,
    setSuggestedCommunities,
  ] = useState<any[]>([]);

  /*
   * ---------------------------------------------------------
   * ROLE FLAGS
   * ---------------------------------------------------------
   */

  const isOwner =
    Number(user?.id) ===
      Number(community?.owner?.id) ||
    community?.my_role === "owner";

  const isAdmin =
    community?.my_role === "admin";

  const isModerator =
    community?.my_role === "moderator";

  const canModerate =
    isOwner ||
    isAdmin ||
    isModerator;

  const canManage =
    isAdmin ||
    isModerator ||
    isOwner;

  const canPin =
    isAdmin ||
    isOwner ||
    isModerator;

  const canApprovePosts =
    isOwner ||
    isAdmin ||
    isModerator;

  // Only owner can see settings.
  const canSeeSettings = isOwner;

  const canDeleteRejected =
    canManage;

  const canDeleteApproved =
    isOwner ||
    isAdmin;

  const canEditApproved =
    isOwner ||
    isAdmin;

  const canBulkModerate =
    canManage;

  // Only non-owner can leave.
  const canLeave =
    !isOwner &&
    community?.joined === true;

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    fetchCommunity();
    fetchPosts();
    fetchPendingPosts();
    fetchMembers();
    fetchSuggested();

    fetchStarredUsers();
  }, [communityId]);

  /*
   * ---------------------------------------------------------
   * POST / REPOST / SHARE DELETE EVENTS
   * ---------------------------------------------------------
   *
   * Web window events are replaced by DeviceEventEmitter.
   */

  useEffect(() => {
    const postSubscription =
      DeviceEventEmitter.addListener(
        POST_DELETED_EVENT,
        (event: {
          postId?: number;
        }) => {
          const deletedPostId =
            Number(event?.postId);

          if (!deletedPostId) return;

          setPosts((prev) =>
            removePostFromState(
              prev,
              deletedPostId
            )
          );
        }
      );

    const repostSubscription =
      DeviceEventEmitter.addListener(
        REPOST_DELETED_EVENT,
        (event: {
          repostId?: number;
        }) => {
          const repostId =
            Number(event?.repostId);

          if (!repostId) return;

          setPosts((prev) =>
            prev.filter(
              (post: any) => {
                const isRepost =
                  post.type === "repost" ||
                  post.feed_type === "repost";

                if (!isRepost) {
                  return true;
                }

                return (
                  Number(post.id) !==
                  repostId
                );
              }
            )
          );
        }
      );

    const shareSubscription =
      DeviceEventEmitter.addListener(
        SHARE_DELETED_EVENT,
        (event: {
          shareId?: number;
        }) => {
          const shareId =
            Number(event?.shareId);

          if (!shareId) return;

          setPosts((prev) =>
            prev.filter(
              (post: any) => {
                const isShare =
                  post.type === "share" ||
                  post.feed_type === "share";

                if (!isShare) {
                  return true;
                }

                return (
                  Number(post.id) !==
                  shareId
                );
              }
            )
          );
        }
      );

    return () => {
      postSubscription.remove();
      repostSubscription.remove();
      shareSubscription.remove();
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * FEED POST STATS
   * ---------------------------------------------------------
   */

  const handleFeedPostStats = (
    postId: number,
    data: any
  ) => {
    setPosts((prev) =>
      prev.map((item: any) => {
        /*
         * Normal post
         */

        if (
          Number(item.id) ===
          Number(postId)
        ) {
          return {
            ...item,

            likes_count:
              data.likes_count ??
              item.likes_count,

            comments_count:
              data.comments_count ??
              item.comments_count,

            shares_count:
              data.shares_count ??
              item.shares_count,

            views_count:
              data.views_count ??
              item.views_count,
          };
        }

        /*
         * Repost
         */

        if (
          item.type === "repost" ||
          item.feed_type === "repost"
        ) {
          const originalPostId =
            Number(
              item.post?.id ??
                item.data?.post?.id ??
                item.post_id
            );

          if (
            originalPostId ===
            Number(postId)
          ) {
            return {
              ...item,

              post: {
                ...item.post,

                likes_count:
                  data.likes_count ??
                  item.post?.likes_count,

                comments_count:
                  data.comments_count ??
                  item.post?.comments_count,

                shares_count:
                  data.shares_count ??
                  item.post?.shares_count,

                views_count:
                  data.views_count ??
                  item.post?.views_count,
              },
            };
          }
        }

        /*
         * Share
         */

        if (
          item.type === "share" ||
          item.feed_type === "share"
        ) {
          const originalPostId =
            Number(
              item.post?.id ??
                item.data?.post?.id ??
                item.post_id
            );

          if (
            originalPostId ===
            Number(postId)
          ) {
            return {
              ...item,

              post: {
                ...item.post,

                likes_count:
                  data.likes_count ??
                  item.post?.likes_count,

                comments_count:
                  data.comments_count ??
                  item.post?.comments_count,

                shares_count:
                  data.shares_count ??
                  item.post?.shares_count,

                views_count:
                  data.views_count ??
                  item.post?.views_count,
              },
            };
          }
        }

        return item;
      })
    );
  };

  /*
   * ---------------------------------------------------------
   * FEED SOCKET
   * ---------------------------------------------------------
   */

  useFeedSocket({
    type: "community",
    communityId: Number(
      communityId
    ),

    onStats: (data) => {
      handleFeedPostStats(
        data.post_id,
        data
      );
    },

    onNewComment: (data) => {
      handleFeedPostStats(
        data.post_id,
        {
          comments_count:
            data.comments_count,
        }
      );
    },

    onCommentDeleted: (data) => {
      handleFeedPostStats(
        data.post_id,
        {
          comments_count:
            data.comments_count,
        }
      );
    },

    onCommentUpdated: () => {},
  });

  /*
   * ---------------------------------------------------------
   * STARRED USERS
   * ---------------------------------------------------------
   */

  const fetchStarredUsers = async () => {
    try {
      const res = await apiRequest(
        "api/users/starred/"
      );

      setStarredUsers(
        new Set(
          res.starred_users || []
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  /*
   * ---------------------------------------------------------
   * FETCH COMMUNITY
   * ---------------------------------------------------------
   */

  const fetchCommunity = async () => {
    try {
      const data = await apiRequest(
        `api/communities/${communityId}/`
      );

      setCommunity(data);
    } catch (err) {
      console.error(
        "Failed to fetch community:",
        err
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * FETCH SUGGESTIONS
   * ---------------------------------------------------------
   */

  const fetchSuggested = async () => {
    try {
      const data = await apiRequest(
        `api/communities/${communityId}/suggested/`
      );

      setSuggestedCommunities(
        data || []
      );
    } catch (err) {
      console.error(
        "Failed to fetch suggested communities:",
        err
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * MAP COMMUNITY POST
   * ---------------------------------------------------------
   */

  const mapCommunityPost = (
    item: any
  ) => {
    /*
     * SHARE
     */

    if (item.type === "share") {
      return {
        ...item,

        type: "share",

        created_at:
          item.created_at,

        community_pinned:
          item.community_pinned ||
          false,

        community_pin_order:
          item.community_pin_order ||
          0,

        post: item.post
          ? {
              ...item.post,

              likes_count:
                item.post.likes_count ||
                0,

              comments_count:
                item.post.comments_count ||
                0,

              shares_count:
                item.post.shares_count ||
                0,

              media_files:
                item.post.media_files ||
                [],
            }
          : null,
      };
    }

    /*
     * REPOST
     */

    if (item.type === "repost") {
      return {
        ...item,

        type: "repost",

        created_at:
          item.created_at,

        community_pinned:
          item.community_pinned ||
          false,

        community_pin_order:
          item.community_pin_order ||
          0,

        post: item.post
          ? {
              ...item.post,

              likes_count:
                item.post.likes_count ||
                0,

              comments_count:
                item.post.comments_count ||
                0,

              shares_count:
                item.post.shares_count ||
                0,

              media_files:
                item.post.media_files ||
                [],
            }
          : null,
      };
    }

    /*
     * NORMAL POST
     */

    return {
      ...item,

      type: "post",

      community_pinned:
        item.community_pinned ||
        false,

      community_pin_order:
        item.community_pin_order ||
        0,

      likes_count:
        item.likes_count || 0,

      comments_count:
        item.comments_count || 0,

      shares_count:
        item.shares_count || 0,

      media_files:
        item.media_files || [],
    };
  };

  /*
   * ---------------------------------------------------------
   * FETCH POSTS
   * ---------------------------------------------------------
   */

  const fetchPosts = async () => {
    setLoading(true);

    try {
      const data = await apiRequest(
        `api/communities/${communityId}/feed/`
      );

      const results =
        data.results || data;

      const mapped =
        results.map(
          mapCommunityPost
        );

      setPosts(mapped);

      setPageCount(1);
      setHasMore(true);
    } catch (err) {
      console.error(
        "Failed to fetch community posts:",
        err
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * REFRESH FEED
   * ---------------------------------------------------------
   */

  const refreshFeed = async () => {
    try {
      await apiRequest(
        `api/communities/${communityId}/refresh_feed/`,
        {
          method: "POST",
        }
      );

      setPageCount(1);
      setShowRefresh(false);
      setHasMore(true);

      await fetchPosts();
    } catch (err) {
      console.error(err);

      Alert.alert(
        "Error",
        "Failed to refresh feed."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD MORE
   * ---------------------------------------------------------
   */

  const loadMore = async () => {
    if (!hasMore) return;

    try {
      const nextPage =
        pageCount + 1;

      const data =
        await apiRequest(
          `api/communities/${communityId}/feed/?page=${nextPage}`
        );

      const newPosts =
        (data.results || [])
          .map(mapCommunityPost);

      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }

      setPosts((prev) => [
        ...prev,
        ...newPosts,
      ]);

      setPageCount(nextPage);

      if (nextPage >= 5) {
        setShowRefresh(true);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      setHasMore(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * SUGGESTIONS VISIBILITY
   * ---------------------------------------------------------
   */

  const showSuggestions =
    suggestedCommunities.length > 0 &&
    suggestedCommunities.some(
      (c) => !c.joined
    );

  /*
   * ---------------------------------------------------------
   * PENDING POSTS
   * ---------------------------------------------------------
   */

  const fetchPendingPosts = async () => {
    try {
      const data =
        await apiRequest(
          `api/communities/${communityId}/pending_posts/`
        );

      console.log(
        "RAW PENDING RESPONSE:",
        data
      );

      setPendingPosts(
        data.results || data
      );
    } catch (err) {
      console.error(
        "Failed to fetch pending posts:",
        err
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * MEMBERS
   * ---------------------------------------------------------
   */

  const fetchMembers = async () => {
    try {
      const data =
        await apiRequest(
          `api/communities/${communityId}/members/`
        );

      setMembers(data);
    } catch (err) {
      console.error(
        "Failed to fetch members:",
        err
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * POST ACTIONS
   * ---------------------------------------------------------
   */

  const handlePostAction = async (
    action: string,
    postId: number
  ) => {
    switch (action) {
      /*
       * EDIT POST
       */

      case "edit":
        push(
          `/main/create-post?edit=true&postId=${postId}`
        );
        break;

      /*
       * DELETE POST
       */

      case "delete":
        try {
          await deletePostEverywhere(
            postId
          );

          setPosts((prev) =>
            prev.filter(
              (post: any) => {
                if (
                  post.id === postId
                ) {
                  return false;
                }

                if (
                  post.type ===
                    "repost" &&
                  (
                    post.post?.id ===
                      postId ||
                    post.post_id ===
                      postId
                  )
                ) {
                  return false;
                }

                return true;
              }
            )
          );

          Alert.alert(
            "Success",
            "Post deleted."
          );
        } catch (err) {
          console.error(err);

          Alert.alert(
            "Error",
            "Failed to delete post."
          );
        }

        break;

      /*
       * DELETE SHARE
       */

      case "delete_share":
        try {
          await deletePostEverywhere(
            postId,
            "share"
          );

          setPosts((prev) =>
            prev.filter(
              (post: any) =>
                Number(post.id) !==
                Number(postId)
            )
          );

          Alert.alert(
            "Success",
            "Share deleted."
          );
        } catch (err) {
          console.error(err);

          Alert.alert(
            "Error",
            "Failed to delete share."
          );
        }

        break;

      /*
       * NORMAL REPOST
       */

      case "repost_normal":
        try {
          await apiRequest(
            `api/posts/${postId}/repost/`,
            {
              method: "POST",
              data: {
                type: "normal",
              },
            }
          );

          Alert.alert(
            "Success",
            "Reposted!"
          );
        } catch (err) {
          console.error(err);

          Alert.alert(
            "Error",
            "Failed to repost."
          );
        }

        break;

      /*
       * QUOTE REPOST
       */

      case "repost_quote":
        push(
          `/main/repost/${postId}`
        );
        break;

      /*
       * DELETE REPOST
       */

      case "delete_repost":
        try {
          await deletePostEverywhere(
            postId,
            "repost"
          );

          setPosts((prev) =>
            prev.filter(
              (post: any) =>
                Number(post.id) !==
                Number(postId)
            )
          );

          Alert.alert(
            "Success",
            "Repost deleted."
          );
        } catch (err) {
          console.error(err);

          Alert.alert(
            "Error",
            "Failed to delete repost."
          );
        }

        break;

      default:
        break;
    }
  };

  /*
   * ---------------------------------------------------------
   * VISIBLE POSTS
   * ---------------------------------------------------------
   */

  const visiblePosts = useMemo(() => {
    return posts.filter(
      (post: any) => {
        const postUserId =
          post.type === "repost" ||
          post.type === "share"
            ? post.post?.user?.id
            : post.user?.id;

        if (!postUserId) {
          return true;
        }

        return (
          !mutedUserIds.has(
            Number(postUserId)
          ) &&
          !blockedUserIds.has(
            Number(postUserId)
          )
        );
      }
    );
  }, [
    posts,
    mutedUserIds,
    blockedUserIds,
  ]);

  /*
   * ---------------------------------------------------------
   * SELECT PENDING ITEM
   * ---------------------------------------------------------
   */

  const toggleSelect = (
    item: PendingItem
  ) => {
    setSelectedPosts((prev) => {
      const exists = prev.some(
        (selected) =>
          selected.type ===
            item.type &&
          Number(selected.id) ===
            Number(item.id)
      );

      if (exists) {
        return prev.filter(
          (selected) =>
            !(
              selected.type ===
                item.type &&
              Number(selected.id) ===
                Number(item.id)
            )
        );
      }

      return [
        ...prev,
        item,
      ];
    });
  };

  /*
   * ---------------------------------------------------------
   * APPLY JOIN STATUS
   * ---------------------------------------------------------
   */

  const applyJoinStatus = (
    status: string
  ) => {
    if (
      status === "joined" ||
      status === "already_joined"
    ) {
      setCommunity(
        (prev: any) => ({
          ...prev,
          joined: true,
          requested: false,
          invited: false,
        })
      );

      return;
    }

    if (
      status === "requested" ||
      status === "already_requested"
    ) {
      setCommunity(
        (prev: any) => ({
          ...prev,
          joined: false,
          requested: true,
          invited: false,
        })
      );

      return;
    }

    /*
     * INVITED = BLOCK STATE
     */

    if (status === "invited") {
      setCommunity(
        (prev: any) => ({
          ...prev,
          joined: false,
          requested: false,
          invited: true,
        })
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * JOIN SUGGESTED COMMUNITY
   * ---------------------------------------------------------
   */

  const handleJoinCommunity = async (
    targetCommunityId: number
  ) => {
    const previousSuggested = [
      ...suggestedCommunities,
    ];

    /*
     * Optimistic update
     */

    setSuggestedCommunities(
      (prev: any[]) =>
        prev.map((c: any) => {
          if (
            c.id !==
            targetCommunityId
          ) {
            return c;
          }

          return {
            ...c,
            joined: true,
            requested: false,
          };
        })
    );

    try {
      const response =
        await apiRequest(
          `api/communities/${targetCommunityId}/join/`,
          {
            method: "POST",
          }
        );

      console.log(
        "JOIN RESPONSE",
        response
      );

      applyJoinStatus(
        response.status
      );
    } catch (err) {
      console.error(err);

      setSuggestedCommunities(
        previousSuggested
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * JOIN CURRENT COMMUNITY
   * ---------------------------------------------------------
   */

  const onJoin = async () => {
    const previousCommunity = {
      ...community,
    };

    /*
     * Optimistic update
     */

    setCommunity(
      (prev: any) => ({
        ...prev,
        joined: true,
        requested: false,
        invited: false,
      })
    );

    try {
      const response =
        await apiRequest(
          `api/communities/${communityId}/join/`,
          {
            method: "POST",
          }
        );

      applyJoinStatus(
        response.status
      );
    } catch (err) {
      console.error(err);

      setCommunity(
        previousCommunity
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * LEAVE COMMUNITY
   * ---------------------------------------------------------
   */

  const handleLeave = async () => {
    const previous = community;

    setCommunity(
      (prev: any) => ({
        ...prev,
        joined: false,
        requested: false,
      })
    );

    try {
      await apiRequest(
        `api/communities/${communityId}/leave/`,
        {
          method: "POST",
        }
      );

      if (community?.tribe?.id) {
        replace(
          `/main/tribe/${community.tribe.id}`
        );
      } else {
        replace(
          `/main/community/${community.id}`
        );
      }
    } catch (err) {
      setCommunity(previous);

      console.error(err);
    }
  };

  /*
   * ---------------------------------------------------------
   * COMMUNITY PIN
   * ---------------------------------------------------------
   */

  const handleToggleCommunityPin =
    async (postId: number) => {
      const previousPosts = [
        ...posts,
      ];

      const updated = (
        post: any
      ) =>
        post.id === postId
          ? {
              ...post,
              community_pinned:
                !post.community_pinned,
            }
          : post;

      setPosts((prev) =>
        prev.map(updated)
      );

      try {
        await apiRequest(
          `api/post/${postId}/toggle_community_pin/`,
          {
            method: "POST",
          }
        );

        await fetchPosts();
      } catch (err) {
        setPosts(previousPosts);

        console.error(err);
      }
    };

  /*
   * ---------------------------------------------------------
   * MODERATION
   * ---------------------------------------------------------
   */

  const handleModeration = async (
    action: "approve" | "reject",
    items?: PendingItem[]
  ) => {
    const targetItems =
      items || selectedPosts;

    if (!targetItems.length) {
      return;
    }

    try {
      await apiRequest(
        `api/communities/moderate/`,
        {
          method: "POST",
          data: {
            items: targetItems,
            action,
          },
        }
      );

      setPendingPosts(
        (prev) =>
          prev.filter(
            (item) =>
              !targetItems.some(
                (selected) =>
                  selected.type ===
                    item.type &&
                  Number(
                    selected.id
                  ) ===
                    Number(item.id)
              )
          )
      );

      setSelectedPosts([]);
      setSelectMode(false);

      Alert.alert(
        "Success",
        action === "approve"
          ? "Approved successfully"
          : "Rejected successfully"
      );
    } catch (err) {
      console.error(err);

      Alert.alert(
        "Error",
        `Failed to ${action} item`
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 40,
          paddingHorizontal: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-3xl">
          {/* COMMUNITY HEADER */}

          <CommunityHeader
            community={community}
            membersCount={
              members.length
            }
            user={user}
            onJoin={onJoin}
            onOpenMenu={() =>
              setShowMenuModal(true)
            }
            communityId={communityId}
            canManage={canManage}
          />

          {/* CREATE POST */}

          {user && (
            <View className="flex-row items-center gap-3 px-1 pt-3">
              <Pressable
                onPress={() =>
                  push(
                    `/main/profile/${user.username}`
                  )
                }
              >
                {user.avatar ? (
                  <Image
                    source={{
                      uri: user.avatar,
                    }}
                    className="h-10 w-10 rounded-full border-2 border-gray-400 dark:border-white"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-400">
                    <Text className="text-xs text-white">
                      {user.email
                        ?.slice(0, 2)
                        .toUpperCase() ||
                        "??"}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() =>
                  push(
                    `/main/create-post?communityId=${communityId}`
                  )
                }
                className="flex-1 rounded-xl border border-gray-300 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-gray-500 dark:text-gray-400">
                  What's happening in this community?
                </Text>
              </Pressable>
            </View>
          )}

          {/* TABS */}

          <View className="mt-4">
            <CommunityTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onChat={() =>
                push(
                  `/main/community/${communityId}/chat`
                )
              }
            />
          </View>

          {/* POSTS */}

          {activeTab === "posts" && (
            <View className="mt-3">
              <CommunityPosts
                posts={visiblePosts}
                loading={loading}
                onToggleCommunityPin={
                  handleToggleCommunityPin
                }
                handleJoinCommunity={(
                  id: number
                ) =>
                  handleJoinCommunity(id)
                }
                currentUser={user}
                canDelete={canModerate}
                canRepost={true}
                canManage={canManage}
                handlePostAction={
                  handlePostAction
                }
                showRefresh={
                  showRefresh
                }
                hasMore={hasMore}
                starredUserIds={
                  starredUsers
                }
                setStarredUserIds={
                  setStarredUsers
                }
                loadMore={loadMore}
                refreshFeed={
                  refreshFeed
                }
                suggestedCommunities={
                  suggestedCommunities
                }
                showSuggestions={
                  showSuggestions
                }
              />
            </View>
          )}

          {/* PENDING */}

          {activeTab === "pending" && (
            <View className="mt-3">
              <CommunityPending
                setActionType={
                  setActionType
                }
                pendingPosts={
                  pendingPosts
                }
                selectMode={
                  selectMode
                }
                selectedPosts={
                  selectedPosts
                }
                toggleSelect={
                  toggleSelect
                }
                handleModeration={
                  handleModeration
                }
                setSelectMode={
                  setSelectMode
                }
                canModerate={
                  canModerate
                }
                currentUser={user}
                starredUserIds={
                  starredUsers
                }
              />
            </View>
          )}

          {/* MEMBERS */}

          {activeTab === "members" && (
            <View className="mt-3">
              <CommunityMembers
                members={members}
                isOwner={isOwner}
                communityId={
                  communityId
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* COMMUNITY MENU */}

      <CommunityMenuModal
        isOpen={showMenuModal}
        onClose={() =>
          setShowMenuModal(false)
        }
        isOwner={isOwner}
        canManage={canManage}
        canLeave={canLeave}
        onLeave={handleLeave}
        onSettings={() =>
          push(
            `/main/community/${communityId}/settings`
          )
        }
        onRejected={() =>
          push(
            `/main/community/${communityId}/rejected`
          )
        }
        onInfo={() =>
          push(
            `/main/community/${communityId}/info`
          )
        }
        onApproved={() =>
          push(
            `/main/community/${communityId}/approve`
          )
        }
        onJoinRequests={() =>
          push(
            `/main/community/${communityId}/join-requests`
          )
        }
      />

      {/* MODERATION BAR */}

      {selectMode &&
        canModerate &&
        selectedPosts.length > 0 && (
          <ModerationBar
            selectedCount={
              selectedPosts.length
            }
            onCancel={() => {
              setSelectMode(false);
              setSelectedPosts([]);
            }}
            onApprove={() =>
              handleModeration(
                "approve",
                selectedPosts
              )
            }
            onReject={() =>
              handleModeration(
                "reject",
                selectedPosts
              )
            }
          />
        )}
    </View>
  );
}