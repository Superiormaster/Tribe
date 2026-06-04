'use client';

import { useEffect, useState } from "react";
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';

import CommunityHeader from "@/components/community/CommunityHeader";
import CommunityTabs from "@/components/community/CommunityTabs";
import CommunityPosts from "@/components/community/CommunityPosts";
import CommunityPending from "@/components/community/CommunityPending";
import CommunityMembers from "@/components/community/CommunityMembers";
import CommunityMenuModal from "@/components/community/CommunityMenuModal";
import ModerationBar from "@/components/community/ModerationBar";

import { apiRequest } from "@/utils/api";

type Post = {
  id: number;
  community_pinned?: boolean
  community_pin_order?: number | null
};

export default function CommunityPage({
  communityId,
  user,
}: any) {

  const { push, replace } = useNavigation();

  const [community, setCommunity] = useState<any>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("posts");

  const [showMenuModal, setShowMenuModal] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [actionType, setActionType] =
    useState<"approve" | "reject" | null>(null);

  const [loading, setLoading] = useState(false);
  
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
  const canLeave = !isOwner;

  useEffect(() => {
    fetchCommunity();
    fetchPosts();
    fetchPendingPosts();
    fetchMembers();
  }, []);

  const fetchCommunity = async () => {
    const data = await apiRequest(
      `api/communities/${communityId}/`
    );

    setCommunity(data);
  };

  const fetchPosts = async () => {
    setLoading(true);
  
    try {
  
      // COMMUNITY FEED
      const data = await apiRequest(
        `api/communities/${communityId}/feed/`
      );
  
      const results = data.results || data;
  
      const mapped = results.map((item: any) => {
  
        // -------------------------
        // REPOST
        // -------------------------
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
  
        // -------------------------
        // NORMAL POST
        // -------------------------
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
      });
  
      setPosts(mapped);
  
    } catch (err) {
  
      console.error(err);
  
    } finally {
  
      setLoading(false);
  
    }
  };

  const fetchPendingPosts = async () => {
    const data = await apiRequest(
      `api/post/?community=${communityId}&is_approved=false`
    );

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
      case 'delete':
        console.log('Delete post', postId);
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

  const toggleSelect = (id: number) => {
    setSelectedPosts((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };
  
  const onJoin = async () => {
    // optimistic update
    setCommunity((prev: any) => ({
      ...prev,
      joined: true,
    }));
  
    try {
      await apiRequest(`api/communities/${communityId}/join/`, {
        method: "POST",
      });
    } catch (err) {
      // rollback
      setCommunity((prev: any) => ({
        ...prev,
        joined: false,
      }));
    }
  };
  
  const handleLeave = async () => {
    setCommunity((prev: any) => ({
      ...prev,
      joined: false,
    }));
  
    try {
      await apiRequest(`api/communities/${communityId}/leave/`, {
        method: "POST",
      });
    } catch (err) {
      setCommunity((prev: any) => ({
        ...prev,
        joined: true,
      }));
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

  const handleBulkAction = async () => {
    await apiRequest(`api/post/bulk-moderate/`, {
      method: "POST",
      data: {
        post_ids: selectedPosts,
        action: actionType,
      },
    });

    setSelectedPosts([]);
    setSelectMode(false);

    fetchPendingPosts();
  };
  
  const handleBulkApprove = async () => {
    try {
  
      await apiRequest(
        `api/post/bulk-moderate/`,
        {
          method: "POST",
          data: {
            post_ids: selectedPosts,
            action: "approve",
          },
        }
      );
  
      setPendingPosts(prev =>
        prev.filter(
          p => !selectedPosts.includes(p.id)
        )
      );
  
      setSelectedPosts([]);
      setSelectMode(false);
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleBulkReject = async () => {
    try {
  
      await apiRequest(
        `api/post/bulk-moderate/`,
        {
          method: "POST",
          data: {
            post_ids: selectedPosts,
            action: "reject",
          },
        }
      );
  
      setPendingPosts(prev =>
        prev.filter(
          p => !selectedPosts.includes(p.id)
        )
      );
  
      setSelectedPosts([]);
      setSelectMode(false);
  
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 mt-8">

      <CommunityHeader
        community={community}
        membersCount={members.length}
        user={user}
        onJoin={onJoin}
        onOpenMenu={() => setShowMenuModal(true)}
        communityId={communityId}
      />

      {/* 🔥 CREATE POST */}
      {user && (
        <div className="flex items-center gap-3 px-1 pt-2">
          <AppLink href={`/main/profile/${user.username}`}
          prefetch={false}
          className="flex items-center gap-2">
            {user.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                {user.email?.slice(0, 2).toUpperCase() || '??'}
              </div>
            )}
          </AppLink>
          <AppLink
            href={`/main/create-post?communityId=${communityId}&mode=${
                  community?.tribe?.name === "Entertainment"
                    ? "reel"
                    : "community"
                }`}
            className="p-2 flex-1 rounded-xl bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 cursor-pointer"
          >
            What's happening in this community?
          </AppLink>
        </div>
      )}

      <CommunityTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canModerate={canModerate}
        onChat={() =>
          push(`/main/community/${communityId}/chat`)
        }
      />

      {activeTab === "posts" && (
        <>
          <CommunityPosts
            posts={posts}
            loading={loading}
            onToggleCommunityPin={handleToggleCommunityPin}
            canDelete={canModerate}
            canEdit={true}
            canRepost={true}
            onToggleProfilePin={undefined}
            canManage={canManage} 
            handlePostAction={handlePostAction}
          />
        </>
      )}

      {activeTab === "pending" && canModerate && (
        <CommunityPending
          pendingPosts={pendingPosts}
          selectMode={selectMode}
          selectedPosts={selectedPosts}
          toggleSelect={toggleSelect}
          setActionType={setActionType}
          setSelectMode={setSelectMode}
        />
      )}

      {activeTab === "members" && (
        <CommunityMembers
          members={members}
          isOwner={isOwner}
          communityId={communityId}
        />
      )}

      <CommunityMenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        isOwner={isOwner}
        canManage={canManage}
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

      {selectMode && selectedPosts.length > 0 && (
        <ModerationBar
          selectedCount={selectedPosts.length}
          onCancel={() => {
            setSelectMode(false);
            setSelectedPosts([]);
          }}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
        />
      )}

    </div>
  );
}