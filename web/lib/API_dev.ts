import { apiRequest } from '@/utils/api';

export type User = {
  id: number;
  username: string;
  avatar?: string;
  starred?: boolean;
  requestPending?: boolean;
};

export type Message = {
  id: number;
  fromUserId: number;
  toUserId: number;
  username: string;
  avatar?: string;
  text: string;
  created_at: string;
  read?: boolean;
};

export type Community = {
  id: string;
  name: string;
  membersCount: number;
  cover_image: string;
  joined: boolean;
  intro_video?: string;
}

export type Tribe = {
  id: string;
  name: string;
  description?: string;
  membersCount: number;
  communities: Community[];
};

export async function joinCommunity(communityId: string) {
  return apiRequest(`api/communities/${communityId}/join/`, {
    method: 'POST',
  });
}

export async function leaveCommunity(communityId: string) {
  return apiRequest(`api/communities/${communityId}/leave/`, 'POST');
}

// ------------------- TRIBES -------------------
export const fetchTribeData = async (
  tribeId: string,
  page = 1,
  currentUserId?: number
): Promise<Tribe> => {
  const tribe = await apiRequest(`api/tribes/${tribeId}/`);

  const communities: Community[] = (tribe.communities || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    membersCount: c.members_count || 0,
    cover_image: c.cover_image || "",
    joined: c.joined || false,
    requested: c.requested || false, 
    invited: c.invited || false,
    join_approval_required: c.join_approval_required || false,
  }));

  return {
    id: tribe.id,
    name: tribe.name,
    description: tribe.description,
    membersCount: tribe.members_count || 0,
    communities: communities,
  };
};