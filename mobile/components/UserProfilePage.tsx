import {
useState,
useEffect,
useMemo,
useContext,
} from "react";
import {
Alert,
DeviceEventEmitter,
Image as RNImage,
Linking,
Pressable,
ScrollView,
Text,
View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Svg, {
Circle,
} from "react-native-svg";

import { useNavigation } from "@/utils/useNavigation";
import AppLink from "@/components/AppLink";
import { useFeedSocket } from "@/lib/useFeedSocket";
import { uploadProfileMedia } from "@/utils/r2";
import { deletePostEverywhere } from "@/utils/deletePost";
import { UserContext } from "@/components/UserContext";
import { openChat as openPrivateChat } from "@/lib/inbox/openChat";

import {
Home,
Star,
Camera,
Image as ImageIcon,
Send,
Video,
} from "lucide-react-native";

import { websiteToUrl } from "@/utils/normalizeWebsite";

import Skeleton from "@/components/Skeleton";
import PostCard from "@/components/PostCard";
import ReelCard from "@/components/ReelCard";
import RepostCard from "@/components/repost/RepostCard";

import {
POST_DELETED_EVENT,
REPOST_DELETED_EVENT,
SHARE_DELETED_EVENT,
} from "@/lib/postEvents";

import {
removePostFromState,
} from "@/lib/removePostFromState";

import SortablePinnedPost from "@/components/SortablePinnedPost";

import {
connectUser,
starCreator,
} from "@/lib/api";

import { apiRequest } from "@/utils/api";
import { formatCount } from "@/utils/formatCount";

type Post = {
type?: "post" | "repost" | "share";

post?: {
id?: number;
media_files: {
file_url: string;
thumbnail_url?: string;
media_type: "image" | "video";
}[];
likes_count?: number;
comments_count?: number;
shares_count?: number;
views_count?: number;
profile_pinned?: boolean;
profile_pin_order?: number | null;
};

id: number;

user: {
id: number;
username: string;
avatar?: string;
is_starred_by_user: boolean;
};

is_starred_by_user: boolean;

caption?: string;

media_files: {
file_url: string;
thumbnail_url?: string;
media_type: "image" | "video";
}[];

content_type: string;
likes_count: number;
comments_count: number;
liked_by_user: boolean;
created_at: string;

community_name?: string;

views_count: number;

is_deleted?: boolean;

profile_pinned?: boolean;
profile_pin_order?: number | null;

community_pinned?: boolean;
community_pin_order?: number | null;
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

export default function UserProfilePage({
videoRef,
}: {
videoRef?: (el: any) => void;
}) {
const params = useLocalSearchParams<{
username?: string | string[];
}>();

const { push } = useNavigation();

const {
user: currentUser,
setUser,
} = useContext(UserContext)!;

const usernameParam = params.username;

const username =
Array.isArray(usernameParam)
? usernameParam[0]
: usernameParam || "";

const name = decodeURIComponent(username).replace(
/\s+/g,
"_"
);

const [profileUserId, setProfileUserId] =
useState<number | null>(null);

const [avatarUploading, setAvatarUploading] =
useState(false);

const [avatarProgress, setAvatarProgress] =
useState(0);

const [avatarSuccess, setAvatarSuccess] =
useState(false);

const [coverUploading, setCoverUploading] =
useState(false);

const [coverProgress, setCoverProgress] =
useState(0);

const [coverSuccess, setCoverSuccess] =
useState(false);

const [isPrivate, setIsPrivate] =
useState(false);

const [nextPage, setNextPage] =
useState<string | null>(null);

const [loadingMore, setLoadingMore] =
useState(false);

const [profile, setProfile] =
useState<Profile | null>(null);

const [posts, setPosts] =
useState<Post[]>([]);

const [isMyProfile, setIsMyProfile] =
useState(false);

const [showUnstarModal, setShowUnstarModal] =
useState(false);

const [relationship, setRelationship] =
useState({
is_me: false,
is_star: false,
is_connected: false,
request_sent: false,
request_received: false,
});

const [loading, setLoading] =
useState(true);

const [filter, setFilter] =
useState<"all" | "images" | "videos">(
"all"
);

/*

* ---
* ORDER POSTS
* ---

*/

const orderedPosts = useMemo(() => {
return [...posts].sort((a, b) => {
if (
a.profile_pinned &&
!b.profile_pinned
) {
return -1;
}

  if (
    !a.profile_pinned &&
    b.profile_pinned
  ) {
    return 1;
  }

  if (
    a.profile_pinned &&
    b.profile_pinned
  ) {
    return (
      (a.profile_pin_order || 0) -
      (b.profile_pin_order || 0)
    );
  }

  return (
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
  );
});

}, [posts]);

/*

* ---
* FEED SOCKET STATS
* ---

*/

const handleFeedPostStats = (
postId: number,
data: any
) => {
setPosts((prev) =>
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

useFeedSocket({
type: "profile",

userId:
  profileUserId ?? undefined,

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

* ---
* POST EVENTS
* ---

*/

useEffect(() => {
const handlePostDeleted = (event: any) => {
const deletedPostId =
Number(event?.postId);

  if (!deletedPostId) return;

  setPosts((prev) =>
    removePostFromState(
      prev,
      deletedPostId
    )
  );
};

const handleRepostDeleted = (
  event: any
) => {
  const repostId =
    Number(event?.repostId);

  if (!repostId) return;

  setPosts((prev) =>
    prev.filter((post: any) => {
      const isRepost =
        post.type === "repost" ||
        post.feed_type === "repost";

      if (!isRepost) {
        return true;
      }

      return (
        Number(post.id) !== repostId
      );
    })
  );
};

const handleShareDeleted = (
  event: any
) => {
  const shareId =
    Number(event?.shareId);

  if (!shareId) return;

  setPosts((prev) =>
    prev.filter((post: any) => {
      const isShare =
        post.type === "share" ||
        post.feed_type === "share";

      if (!isShare) {
        return true;
      }

      return (
        Number(post.id) !== shareId
      );
    })
  );
};

const postDeletedSubscription =
  DeviceEventEmitter.addListener(
    POST_DELETED_EVENT,
    handlePostDeleted
  );

const repostDeletedSubscription =
  DeviceEventEmitter.addListener(
    REPOST_DELETED_EVENT,
    handleRepostDeleted
  );

const shareDeletedSubscription =
  DeviceEventEmitter.addListener(
    SHARE_DELETED_EVENT,
    handleShareDeleted
  );

return () => {
  postDeletedSubscription.remove();
  repostDeletedSubscription.remove();
  shareDeletedSubscription.remove();
};

}, []);

/*

* ---
* FILTER
* ---

*/

const filteredPosts = useMemo(() => {
return orderedPosts.filter((post) => {
const media =
post.type === "repost"
? post.post?.media_files || []
: post.media_files || [];

  if (filter === "images") {
    return media.some(
      (m) =>
        m.media_type === "image"
    );
  }

  if (filter === "videos") {
    return media.some(
      (m) =>
        m.media_type === "video"
    );
  }

  return true;
});

}, [orderedPosts, filter]);

const pinnedPosts = filteredPosts
.filter(
(p) =>
p.type === "post" &&
p.profile_pinned
)
.sort(
(a, b) =>
(a.profile_pin_order || 0) -
(b.profile_pin_order || 0)
);

const normalPosts =
filteredPosts.filter(
(p) => !p.profile_pinned
);

/*

* ---
* PIN / UNPIN
* ---

*/

const handleTogglePin = async (
postId: number
) => {
const previousPosts = [...posts];

const target = posts.find(
  (p) => p.id === postId
);

if (!target) return;

const isPinned =
  target.profile_pinned;

let updatedPosts = [...posts];

if (isPinned) {
  updatedPosts =
    updatedPosts.map((p) =>
      p.id === postId
        ? {
            ...p,
            profile_pinned: false,
            profile_pin_order: null,
          }
        : p
    );

  const remainingPinned =
    updatedPosts
      .filter(
        (p) => p.profile_pinned
      )
      .sort(
        (a, b) =>
          (a.profile_pin_order || 0) -
          (b.profile_pin_order || 0)
      );

  remainingPinned.forEach(
    (p, index) => {
      p.profile_pin_order =
        index + 1;
    }
  );
} else {
  const currentPinned =
    updatedPosts.filter(
      (p) => p.profile_pinned
    );

  if (currentPinned.length >= 3) {
    Alert.alert(
      "Pinned posts",
      "Maximum 3 pinned posts"
    );
    return;
  }

  updatedPosts =
    updatedPosts.map((p) =>
      p.id === postId
        ? {
            ...p,
            profile_pinned: true,
            profile_pin_order:
              currentPinned.length + 1,
          }
        : p
    );
}

setPosts(updatedPosts);

try {
  await apiRequest(
    `api/post/${postId}/toggle_profile_pin/`,
    {
      method: "POST",
    }
  );
} catch (err) {
  setPosts(previousPosts);
  console.error(err);
}

};

/*

* ---
* NATIVE PIN REORDER
* 
* SortablePinnedPost calls this when the drag
* operation finishes.
* ---

*/

const handleDragEnd = async (
activeId: number,
overId: number
) => {
if (
!activeId ||
!overId ||
activeId === overId
) {
return;
}

const pinned = posts
  .filter(
    (p) => p.profile_pinned
  )
  .sort(
    (a, b) =>
      (a.profile_pin_order || 0) -
      (b.profile_pin_order || 0)
  );

const oldIndex =
  pinned.findIndex(
    (p) => p.id === activeId
  );

const newIndex =
  pinned.findIndex(
    (p) => p.id === overId
  );

if (
  oldIndex < 0 ||
  newIndex < 0
) {
  return;
}

const reorderedPinned = [
  ...pinned,
];

const [moved] =
  reorderedPinned.splice(
    oldIndex,
    1
  );

reorderedPinned.splice(
  newIndex,
  0,
  moved
);

const updatedPinned =
  reorderedPinned.map(
    (p, index) => ({
      ...p,
      profile_pin_order:
        index + 1,
    })
  );

const regularPosts =
  posts.filter(
    (p) => !p.profile_pinned
  );

setPosts([
  ...updatedPinned,
  ...regularPosts,
]);

try {
  await apiRequest(
    "api/post/reorder_pins/",
    {
      method: "POST",
      data: {
        post_ids:
          updatedPinned.map(
            (p) => p.id
          ),
      },
    }
  );
} catch (err) {
  console.error(
    "Failed to reorder pins:",
    err
  );
}

};

/*

* ---
* STARRED USERS
* ---

*/

const starredUserIds = useMemo(() => {
return new Set(
posts
.filter(
(p) =>
p.user
?.is_starred_by_user
)
.map(
(p) => p.user.id
)
);
}, [posts]);

/*

* ---
* MEDIA MAPPING
* ---

*/

const mapMediaFiles = (
media: any[] = []
) => {
if (!Array.isArray(media)) {
return [];
}

return media.map(
  (m: any) => ({
    file_url:
      m?.file_url ||
      m?.url ||
      "",

    thumbnail_url:
      m?.thumbnail_url ||
      "",

    media_type:
      m?.media_type ||
      (m?.file_url?.endsWith(
        ".mp4"
      )
        ? "video"
        : "image"),
  })
);

};

const mapPost = (
p: any
): any => {
if (!p) return null;

if (p.type === "repost") {
  return {
    type: "repost",

    is_starred_by_user:
      p.data
        ?.is_starred_by_user ??
      false,

    id: p.data.id,

    created_at:
      p.data.created_at,

    repost_type:
      p.data.repost_type,

    quote_text:
      p.data.quote_text,

    user:
      p.data.user,

    post: {
      ...p.data.post,

      profile_pinned:
        p.data.post
          ?.profile_pinned ||
        false,

      profile_pin_order:
        p.data.post
          ?.profile_pin_order ||
        null,

      community_pinned:
        p.data.post
          ?.community_pinned ||
        false,

      community_pin_order:
        p.data.post
          ?.community_pin_order ||
        null,

      likes_count:
        p.data.post
          ?.likes_count ||
        0,

      comments_count:
        p.data.post
          ?.comments_count ||
        0,

      shares_count:
        p.data.post
          ?.shares_count ||
        0,

      views_count:
        p.data
          ?.post
          ?.views_count ??
        0,

      liked_by_user:
        p.data.post
          ?.is_liked ||
        false,

      updated_at:
        p.data.post
          ?.updated_at ||
        null,

      media_files:
        mapMediaFiles(
          p.data.post
            ?.media_files
        ),
    },
  };
}

return {
  ...p.data,

  type: "post",

  is_starred_by_user:
    p.data
      ?.is_starred_by_user ??
    false,

  profile_pinned:
    p.data
      ?.profile_pinned ||
    false,

  profile_pin_order:
    p.data
      ?.profile_pin_order ||
    null,

  community_pinned:
    p.data
      ?.community_pinned ||
    false,

  community_pin_order:
    p.data
      ?.community_pin_order ||
    null,

  caption:
    p.data?.caption ||
    "",

  created_at:
    p.data?.created_at ||
    "",

  likes_count:
    p.data
      ?.likes_count ||
    0,

  comments_count:
    p.data
      ?.comments_count ||
    0,

  shares_count:
    p.data
      ?.shares_count ||
    0,

  views_count:
    p.data
      ?.views_count ??
    0,

  liked_by_user:
    p.data?.is_liked ||
    false,

  content_type:
    p.data?.content_type ||
    (p.data?.video
      ? "video"
      : "post"),

  user:
    p.data?.user || {
      id: 0,
      username: "Unknown",
      avatar: "",
    },

  updated_at:
    p.data?.updated_at ||
    null,

  media_files:
    mapMediaFiles(
      p.data?.media_files
    ),

  community_name:
    p.data
      ?.community_name ||
    "",
};

};

/*

* ---
* FETCH PROFILE
* ---

*/

const fetchProfile =
async () => {
try {
const data =
await apiRequest(
"api/users/profile/${username}/"
);

    console.log(
      "PROFILE API RESPONSE:",
      data
    );

    setIsPrivate(
      data?.is_private ||
        false
    );

    const profileData =
      data?.profile ||
      data;

    if (!profileData) {
      console.error(
        "Profile data missing:",
        data
      );

      return {
        is_private: false,
        profile: null,
      };
    }

    setProfile({
      avatar:
        profileData.avatar ||
        "",

      cover_photo:
        profileData.cover_photo ||
        "",

      full_name:
        profileData.full_name ||
        "",

      bio:
        profileData.bio ||
        "",

      city:
        profileData.city ||
        "",

      country:
        profileData.country ||
        "",

      website:
        profileData.website ||
        "",

      creatorType:
        profileData.creator_type ||
        "",

      stars:
        profileData.starred_count ||
        0,

      posts:
        data.stats?.posts ||
        0,

      starredBy:
        profileData.stars_count ||
        0,
    });

    setProfileUserId(
      profileData.id
    );

    setRelationship({
      is_me:
        data.relationship
          ?.is_me ||
        false,

      is_star:
        data.relationship
          ?.is_star ||
        false,

      is_connected:
        data.relationship
          ?.is_connected ||
        false,

      request_sent:
        data.relationship
          ?.request_sent ||
        false,

      request_received:
        data.relationship
          ?.request_received ||
        false,
    });

    const isMe =
      data?.relationship
        ?.is_me ||
      false;

    setIsMyProfile(
      isMe
    );

    return {
      is_private:
        data?.is_private ||
        false,

      profile:
        profileData,

      is_me: isMe,
    };
  } catch (err) {
    console.error(err);

    return {
      is_private: false,
      profile: null,
      is_me: false,
    };
  }
};

/*

* ---
* FETCH POSTS
* ---

*/

const fetchPosts = async (
page?: number | string,
isMe?: boolean
) => {
if (loadingMore) return;

try {
  setLoadingMore(true);

  const endpoint = page
    ? `api/users/profile/${username}/posts/?page=${page}`
    : `api/users/profile/${username}/posts/`;

  const data =
    await apiRequest(
      endpoint
    );

  if (
    data?.code ===
      "private_profile" &&
    !(isMe ?? isMyProfile)
  ) {
    setIsPrivate(true);
    setPosts([]);
    return;
  }

  const newPosts =
    (data.results || [])
      .map(mapPost)
      .filter(Boolean);

  setPosts((prev) => {
    if (!page) {
      return newPosts;
    }

    const merged = [
      ...prev,
      ...newPosts,
    ];

    return merged.filter(
      (
        post,
        index,
        self
      ) =>
        index ===
        self.findIndex(
          (x) =>
            x.id ===
            post.id
        )
    );
  });

  setNextPage(
    data.next
  );
} catch (err: any) {
  if (
    err?.status === 403 &&
    err?.data?.code ===
      "private_profile" &&
    !isMyProfile
  ) {
    setIsPrivate(true);
    setPosts([]);
    return;
  }

  console.error(err);
} finally {
  setLoadingMore(false);
}

};

/*

* ---
* INITIAL LOAD
* ---

*/

useEffect(() => {
if (!username) {
return;
}

let cancelled = false;

const load = async () => {
  setLoading(true);

  try {
    const profileResult =
      await fetchProfile();

    if (cancelled) {
      return;
    }

    await fetchPosts(
      undefined,
      profileResult.is_me
    );
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
};

load();

return () => {
  cancelled = true;
};

}, [username]);

/*

* ---
* IMAGE PICKER
* ---

*/

const pickImage = async () => {
const permission =
await ImagePicker.requestMediaLibraryPermissionsAsync();

if (
  !permission.granted
) {
  Alert.alert(
    "Permission required",
    "Please allow Tribe to access your photos."
  );

  return null;
}

const result =
  await ImagePicker.launchImageLibraryAsync(
    {
      mediaTypes:
        ["images"],
      allowsEditing: false,
      quality: 1,
    }
  );

if (
  result.canceled ||
  !result.assets?.length
) {
  return null;
}

const asset =
  result.assets[0];

return {
  uri: asset.uri,
  name:
    asset.fileName ||
    `tribe-image-${Date.now()}.jpg`,
  type:
    asset.mimeType ||
    "image/jpeg",
  size:
    asset.fileSize || 0,
  lastModified:
    Date.now(),
};

};

/*

* ---
* CHANGE AVATAR
* ---

*/

const handleChangeAvatar =
async () => {
if (avatarUploading) {
Alert.alert(
"Upload in progress",
"Please wait for the current upload to finish."
);

    return;
  }

  const file =
    await pickImage();

  if (!file) {
    return;
  }

  const previousAvatar =
    profile?.avatar || "";

  setAvatarUploading(
    true
  );

  setAvatarProgress(0);
  setAvatarSuccess(false);

  try {
    const completed =
      await uploadProfileMedia(
        {
          file,
          mediaType:
            "avatar",

          onProgress:
            setAvatarProgress,
        }
      );

    if (
      !completed?.original_url
    ) {
      throw new Error(
        "Avatar upload completed but no URL was returned."
      );
    }

    const uploadedUrl =
      completed.original_url;

    await apiRequest(
      "api/users/me/",
      {
        method: "PATCH",
        data: {
          avatar:
            uploadedUrl,
        },
      }
    );

    setProfile(
      (prev) =>
        prev
          ? {
              ...prev,
              avatar:
                uploadedUrl,
            }
          : prev
    );

    setUser(
      (prev: any) => ({
        ...prev,
        avatar:
          uploadedUrl,
      })
    );

    setAvatarProgress(
      100
    );

    setAvatarSuccess(
      true
    );

    Alert.alert(
      "Success",
      "Profile picture updated"
    );

    setTimeout(() => {
      setAvatarSuccess(
        false
      );

      setAvatarUploading(
        false
      );

      setAvatarProgress(
        0
      );
    }, 700);
  } catch (err) {
    console.error(
      "Avatar upload failed:",
      err
    );

    setProfile(
      (prev) =>
        prev
          ? {
              ...prev,
              avatar:
                previousAvatar,
            }
          : prev
    );

    setUser(
      (prev: any) => ({
        ...prev,
        avatar:
          previousAvatar,
      })
    );

    setAvatarUploading(
      false
    );

    setAvatarProgress(
      0
    );

    setAvatarSuccess(
      false
    );

    Alert.alert(
      "Upload failed",
      err instanceof Error
        ? err.message
        : "Failed to update profile picture."
    );
  }
};

/*

* ---
* CHANGE COVER
* ---

*/

const handleChangeCover =
async () => {
if (coverUploading) {
Alert.alert(
"Upload in progress",
"Please wait for the current upload to finish."
);

    return;
  }

  const file =
    await pickImage();

  if (!file) {
    return;
  }

  const previousCover =
    profile?.cover_photo || "";

  setCoverUploading(
    true
  );

  setCoverProgress(0);
  setCoverSuccess(false);

  try {
    const completed =
      await uploadProfileMedia(
        {
          file,
          mediaType:
            "cover",

          onProgress:
            setCoverProgress,
        }
      );

    if (
      !completed?.original_url
    ) {
      throw new Error(
        "Cover upload completed but no URL was returned."
      );
    }

    const uploadedUrl =
      completed.original_url;

    await apiRequest(
      "api/users/me/",
      {
        method: "PATCH",
        data: {
          cover_photo:
            uploadedUrl,
        },
      }
    );

    setProfile(
      (prev) =>
        prev
          ? {
              ...prev,
              cover_photo:
                uploadedUrl,
            }
          : prev
    );

    setUser(
      (prev: any) => ({
        ...prev,
        cover_photo:
          uploadedUrl,
      })
    );

    setCoverProgress(
      100
    );

    setCoverSuccess(
      true
    );

    Alert.alert(
      "Success",
      "Cover photo updated"
    );

    setTimeout(() => {
      setCoverSuccess(
        false
      );

      setCoverUploading(
        false
      );

      setCoverProgress(
        0
      );
    }, 700);
  } catch (err) {
    console.error(
      "Cover upload failed:",
      err
    );

    setProfile(
      (prev) =>
        prev
          ? {
              ...prev,
              cover_photo:
                previousCover,
            }
          : prev
    );

    setUser(
      (prev: any) => ({
        ...prev,
        cover_photo:
          previousCover,
      })
    );

    setCoverUploading(
      false
    );

    setCoverProgress(
      0
    );

    setCoverSuccess(
      false
    );

    Alert.alert(
      "Upload failed",
      err instanceof Error
        ? err.message
        : "Failed to update cover photo."
    );
  }
};

/*

* ---
* STAR
* ---

*/

const handleStar =
async () => {
if (!profileUserId) {
return;
}

  try {
    const res =
      await starCreator(
        profileUserId
      );

    setRelationship(
      (prev) => ({
        ...prev,
        is_star:
          res.starred,
      })
    );
  } catch (err) {
    console.error(err);
  }
};

/*

* ---
* CONNECT
* ---

*/

const handleConnect =
async () => {
if (!profileUserId) {
return;
}

  try {
    await connectUser(
      profileUserId
    );

    setRelationship(
      (prev) => ({
        ...prev,
        request_sent:
          true,
        is_connected:
          false,
      })
    );
  } catch (err) {
    console.error(err);
  }
};

/*

* ---
* CHAT
* ---

*/

const handleOpenChat =
async () => {
if (!profileUserId) {
return;
}

  try {
    const res =
      await openPrivateChat(
        profileUserId
      );

    push(
      `/main/messages/chat/${res.chat.id}`
    );
  } catch (err) {
    console.error(
      "Failed to open chat",
      err
    );
  }
};

/*

* ---
* EDIT PROFILE
* ---

*/

const handleEditProfile =
() =>
push(
"/main/edit-profile"
);

/*

* ---
* POST ACTIONS
* ---

*/

const handlePostAction =
async (
action: string,
postId: number
) => {
switch (action) {
case "edit":
push(
"/main/create-post?edit=true&postId=${postId}"
);
break;

    case "delete_repost":
      try {
        await deletePostEverywhere(
          postId,
          "repost"
        );

        setPosts(
          (prev) =>
            prev.filter(
              (post: any) =>
                Number(
                  post.id
                ) !==
                Number(postId)
            )
        );

        Alert.alert(
          "Success",
          "Repost deleted"
        );
      } catch (err) {
        console.error(err);

        Alert.alert(
          "Error",
          "Failed to delete repost"
        );
      }

      break;

    case "delete_share":
      try {
        await deletePostEverywhere(
          postId,
          "share"
        );

        setPosts(
          (prev) =>
            prev.filter(
              (post: any) =>
                Number(
                  post.id
                ) !==
                Number(postId)
            )
        );

        Alert.alert(
          "Success",
          "Share deleted"
        );
      } catch (err) {
        console.error(err);

        Alert.alert(
          "Error",
          "Failed to delete share"
        );
      }

      break;

    case "delete":
      try {
        await deletePostEverywhere(
          postId
        );

        setPosts(
          (prev) =>
            prev.filter(
              (post: any) => {
                if (
                  post.id ===
                  postId
                ) {
                  return false;
                }

                if (
                  post.type ===
                    "repost" &&
                  (
                    post.post
                      ?.id ===
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
          "Post deleted"
        );
      } catch (err) {
        console.error(err);
      }

      break;

    case "repost_normal":
      try {
        await apiRequest(
          `api/post/${postId}/repost/`,
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
      }

      break;

    case "repost_quote":
      push(
        `/main/repost/${postId}`
      );
      break;

    default:
      break;
  }
};

/*

* ---
* WEBSITE
* ---

*/

const websiteUrl = useMemo(() => {
if (!profile?.website) {
return null;
}

try {
  return websiteToUrl(
    profile.website
  );
} catch {
  return null;
}

}, [profile?.website]);

const websiteHost =
useMemo(() => {
if (!websiteUrl) {
return "";
}

  try {
    return websiteUrl
      .replace(
        /^https?:\/\//,
        ""
      )
      .replace(
        /^www\./,
        ""
      )
      .split("/")[0];
  } catch {
    return websiteUrl;
  }
}, [websiteUrl]);

/*

* ---
* PAGINATION
* ---

*/

const loadNextPage =
() => {
if (
!nextPage ||
loadingMore
) {
return;
}

  try {
    const match =
      nextPage.match(
        /[?&]page=([^&]+)/
      );

    const page =
      match?.[1];

    if (page) {
      fetchPosts(page);
    }
  } catch (err) {
    console.error(
      "Invalid pagination URL:",
      err
    );
  }
};

/*

* ---
* LOADING
* ---

*/

if (loading) {
return (
<View className="flex-1 items-center justify-center">
<Skeleton />
</View>
);
}

return (
<ScrollView
className="flex-1 bg-gray-50 dark:bg-gray-950"
contentContainerClassName="mx-auto w-full max-w-3xl px-4 pb-10 pt-16"
showsVerticalScrollIndicator={false}
>
{/* Cover Photo */}
<View className="relative h-40 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
{profile?.cover_photo ? (
<RNImage
source={{
uri: profile.cover_photo,
}}
resizeMode="cover"
className="h-full w-full"
/>
) : (
<View className="flex-1 items-center justify-center">
<Text className="text-sm text-gray-400 dark:text-gray-500">
Tribe Cover Photo
</Text>
</View>
)}

    {isMyProfile && (
      <Pressable
        disabled={
          coverUploading
        }
        onPress={
          handleChangeCover
        }
        className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-indigo-600 active:bg-indigo-700"
      >
        <Camera
          size={17}
          color="#ffffff"
        />
      </Pressable>
    )}

    {coverUploading && (
      <View className="absolute bottom-0 left-0 h-1.5 w-full bg-gray-300/40">
        <View
          className="h-full rounded-r-full bg-indigo-600"
          style={{
            width: `${coverProgress}%`,
          }}
        />
      </View>
    )}

    {coverSuccess && (
      <View className="absolute inset-0 items-center justify-center bg-black/20">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-green-500">
          <Text className="text-2xl font-bold text-white">
            ✓
          </Text>
        </View>
      </View>
    )}
  </View>

  {/* Profile Info */}
  <View className="mt-4 gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
    <View className="flex-row items-center gap-4">
      {/* Avatar */}
      <View className="relative h-24 w-24">
        {(avatarUploading ||
          avatarSuccess) && (
          <Svg
            width={96}
            height={96}
            viewBox="0 0 100 100"
            className="absolute inset-0"
          >
            <Circle
              cx="50"
              cy="50"
              r="46"
              stroke="#E5E7EB"
              strokeWidth="4"
              fill="none"
            />

            <Circle
              cx="50"
              cy="50"
              r="46"
              stroke={
                avatarSuccess
                  ? "#22C55E"
                  : "#4F46E5"
              }
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="289"
              strokeDashoffset={
                avatarSuccess
                  ? 0
                  : 289 -
                    (289 *
                      avatarProgress) /
                      100
              }
              transform="rotate(-90 50 50)"
            />
          </Svg>
        )}

        {profile?.avatar ? (
          <RNImage
            source={{
              uri: profile.avatar,
            }}
            resizeMode="cover"
            className="h-24 w-24 rounded-full"
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-400">
            <Text className="text-xl font-bold text-white">
              {username
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
        )}

        {avatarUploading && (
          <View className="absolute inset-0 items-center justify-center">
            <View className="rounded-full bg-black/60 px-2 py-1">
              <Text className="text-xs font-bold text-white">
                {avatarProgress}%
              </Text>
            </View>
          </View>
        )}

        {avatarSuccess && (
          <View className="absolute inset-0 items-center justify-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Text className="text-xl font-bold text-white">
                ✓
              </Text>
            </View>
          </View>
        )}

        {isMyProfile && (
          <Pressable
            disabled={
              avatarUploading
            }
            onPress={
              handleChangeAvatar
            }
            className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-indigo-600 active:bg-indigo-700"
          >
            <Camera
              size={15}
              color="#ffffff"
            />
          </Pressable>
        )}
      </View>

      {/* Profile Details */}
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-xl font-medium text-gray-800 dark:text-gray-200">
          {profile?.full_name}
        </Text>

        <Text className="text-xs font-bold text-gray-800 dark:text-gray-200">
          @{name}
        </Text>

        {profile?.bio ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {profile.bio}
          </Text>
        ) : null}

        <View className="mt-2 flex-row">
          <View className="flex-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              <Text className="font-semibold text-gray-800 dark:text-gray-200">
                {profile?.posts}
              </Text>{" "}
              Posts
            </Text>
          </View>

          {isMyProfile ? (
            <AppLink
              prefetch={false}
              href="/main/stars/received"
              className="flex-1 flex-row items-center gap-1"
            >
              <Star
                size={16}
                color="#FACC15"
              />

              <Text className="text-sm text-gray-500 dark:text-gray-400">
                <Text className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCount(
                    profile?.stars ??
                      0
                  )}
                </Text>{" "}
                Stars
              </Text>
            </AppLink>
          ) : (
            <View className="flex-1 flex-row items-center gap-1">
              <Star
                size={16}
                color="#FACC15"
              />

              <Text className="text-sm text-gray-500 dark:text-gray-400">
                <Text className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCount(
                    profile?.stars ??
                      0
                  )}
                </Text>{" "}
                Stars
              </Text>
            </View>
          )}

          {isMyProfile ? (
            <AppLink
              prefetch={false}
              href="/main/stars/sent"
              className="flex-1"
            >
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                <Text className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCount(
                    profile?.starredBy ??
                      0
                  )}
                </Text>{" "}
                Starred
              </Text>
            </AppLink>
          ) : (
            <View className="flex-1">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                <Text className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCount(
                    profile?.starredBy ??
                      0
                  )}
                </Text>{" "}
                Starred
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>

    {/* Website */}
    {websiteUrl && (
      <Pressable
        onPress={() =>
          Linking.openURL(
            websiteUrl
          )
        }
      >
        <Text className="text-indigo-600">
          {websiteHost}
        </Text>
      </Pressable>
    )}

    {/* Actions */}
    <View className="flex-row gap-3">
      {isMyProfile && (
        <Pressable
          onPress={
            handleEditProfile
          }
          className="rounded-lg border border-indigo-600 px-4 py-2"
        >
          <Text className="text-indigo-600">
            Edit Profile
          </Text>
        </Pressable>
      )}

      {!relationship.is_me && (
        <>
          {relationship.is_connected && (
            <Pressable
              onPress={
                handleOpenChat
              }
              className="items-center justify-center rounded-lg bg-indigo-600 px-4 py-2"
            >
              <Send
                size={18}
                color="#ffffff"
              />
            </Pressable>
          )}

          {!relationship.is_connected &&
            relationship.request_sent && (
              <View className="rounded-lg bg-gray-500 px-4 py-2">
                <Text className="text-white">
                  Request Sent
                </Text>
              </View>
            )}

          {!relationship.is_connected &&
            !relationship.request_sent && (
              <Pressable
                onPress={
                  handleConnect
                }
                className="rounded-lg bg-indigo-600 px-4 py-2 active:bg-indigo-700"
              >
                <Text className="text-white">
                  Connect
                </Text>
              </Pressable>
            )}

          <Pressable
            onPress={() => {
              if (
                relationship.is_star
              ) {
                setShowUnstarModal(
                  true
                );
              } else {
                handleStar();
              }
            }}
            className={`rounded-lg px-4 py-2 ${
              relationship.is_star
                ? "bg-yellow-500"
                : "bg-indigo-600"
            }`}
          >
            <Text className="text-white">
              {relationship.is_star
                ? "⭐"
                : "Star"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  </View>

  {/* Filter Tabs */}
  <View className="mt-4 flex-row justify-center gap-4 rounded-2xl bg-white p-2 shadow-sm dark:bg-gray-900">
    <Pressable
      className={`rounded-lg p-2 ${
        filter === "all"
          ? "bg-indigo-600"
          : ""
      }`}
      onPress={() =>
        setFilter("all")
      }
    >
      <Home
        size={20}
        color={
          filter === "all"
            ? "#ffffff"
            : "#6B7280"
        }
      />
    </Pressable>

    <Pressable
      className={`rounded-lg p-2 ${
        filter === "images"
          ? "bg-indigo-600"
          : ""
      }`}
      onPress={() =>
        setFilter("images")
      }
    >
      <ImageIcon
        size={20}
        color={
          filter === "images"
            ? "#ffffff"
            : "#6B7280"
        }
      />
    </Pressable>

    <Pressable
      className={`rounded-lg p-2 ${
        filter === "videos"
          ? "bg-indigo-600"
          : ""
      }`}
      onPress={() =>
        setFilter("videos")
      }
    >
      <Video
        size={20}
        color={
          filter === "videos"
            ? "#ffffff"
            : "#6B7280"
        }
      />
    </Pressable>
  </View>

  {/* Posts */}
  {isPrivate &&
  !isMyProfile ? (
    <View className="items-center justify-center py-16">
      <Text className="text-5xl">
        🔒
      </Text>

      <Text className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
        This profile is private
      </Text>

      <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
        You need permission to view this user's posts.
      </Text>
    </View>
  ) : (
    <View className="mt-4 gap-4">
      {/* PINNED POSTS */}
      {pinnedPosts.map(
        (post) => (
          <SortablePinnedPost
            key={post.id}
            post={post}
            onDragEnd={
              handleDragEnd
            }
          >
            {post.content_type ===
            "short_video" ? (
              <ReelCard
                post={post}
              />
            ) : (
              <PostCard
                post={post}
                videoRef={
                  videoRef
                }
                currentUser={
                  currentUser
                }
                isMyProfile={
                  isMyProfile
                }
                handlePostAction={
                  handlePostAction
                }
                showManageButtons={
                  isMyProfile
                }
                hideStarButton={
                  true
                }
                showJoinButton={
                  false
                }
                onToggleProfilePin={
                  handleTogglePin
                }
                isPinnedDraggable={
                  true
                }
                canEdit={true}
                canRepost={true}
                canDelete={true}
                onDelete={(
                  id: number
                ) => {
                  setPosts(
                    (prev) =>
                      prev.filter(
                        (p) =>
                          p.id !==
                          id
                      )
                  );
                }}
                onViewed={() => {
                  setPosts(
                    (prev) =>
                      prev.map(
                        (p) =>
                          p.id ===
                          post.id
                            ? {
                                ...p,
                                views_count:
                                  (p.views_count ||
                                    0) +
                                  1,
                              }
                            : p
                      )
                  );
                }}
              />
            )}
          </SortablePinnedPost>
        )
      )}

      {/* NORMAL POSTS */}
      {normalPosts.length ===
      0 ? (
        <Text className="mt-4 text-center text-gray-500 dark:text-gray-400">
          No posts yet.
        </Text>
      ) : (
        normalPosts.map(
          (item) => {
            if (!item) {
              return null;
            }

            if (
              item.type ===
              "repost"
            ) {
              return (
                <RepostCard
                  key={`repost-${item.id}`}
                  repost={item}
                  currentUser={
                    currentUser
                  }
                  handlePostAction={
                    handlePostAction
                  }
                  starredUserIds={
                    starredUserIds
                  }
                  hideStarButton={
                    true
                  }
                />
              );
            }

            if (
              item.content_type ===
              "short_video"
            ) {
              return (
                <ReelCard
                  key={item.id}
                  post={item}
                />
              );
            }

            return (
              <PostCard
                key={item.id}
                post={item}
                videoRef={
                  videoRef
                }
                currentUser={
                  currentUser
                }
                isMyProfile={
                  isMyProfile
                }
                handlePostAction={
                  handlePostAction
                }
                showManageButtons={
                  isMyProfile
                }
                canEdit={true}
                canRepost={true}
                canDelete={true}
                hideStarButton={
                  true
                }
                showJoinButton={
                  false
                }
                showPinnedLabel={
                  false
                }
                isPinnedDraggable={
                  false
                }
                onToggleProfilePin={
                  handleTogglePin
                }
                onDelete={(
                  id: number
                ) => {
                  setPosts(
                    (prev) =>
                      prev.filter(
                        (p) =>
                          p.id !==
                          id
                      )
                  );
                }}
                onViewed={() => {
                  setPosts(
                    (prev) =>
                      prev.map(
                        (p) =>
                          p.id ===
                          item.id
                            ? {
                                ...p,
                                views_count:
                                  (p.views_count ||
                                    0) +
                                  1,
                              }
                            : p
                      )
                  );
                }}
              />
            );
          }
        )
      )}
    </View>
  )}

  {/* Unstar Modal */}
  {showUnstarModal && (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/50">
      <View className="w-80 rounded-xl bg-indigo-200 p-6 dark:bg-indigo-700">
        <Text className="mb-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
          Unstar this user?
        </Text>

        <View className="flex-row justify-center gap-4">
          <Pressable
            onPress={() =>
              setShowUnstarModal(
                false
              )
            }
            className="rounded-lg bg-gray-300 px-4 py-2"
          >
            <Text className="text-gray-700">
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await handleStar();

              setShowUnstarModal(
                false
              );
            }}
            className="rounded-lg bg-red-500 px-4 py-2"
          >
            <Text className="text-white">
              Unstar
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )}

  {/* Pagination */}
  <View className="items-center py-4">
    {nextPage &&
      !isPrivate && (
        <Pressable
          disabled={
            loadingMore
          }
          onPress={
            loadNextPage
          }
          className="rounded-lg bg-indigo-600 px-5 py-2 disabled:opacity-50"
        >
          <Text className="text-white">
            {loadingMore
              ? "Loading..."
              : "Load more"}
          </Text>
        </Pressable>
      )}

    {!loadingMore &&
      !nextPage &&
      filteredPosts.length >
        0 && (
        <Text className="py-6 text-center text-xs text-gray-400">
          You've reached the end.
        </Text>
      )}

    {loadingMore && (
      <View className="py-6">
        <View className="h-6 w-6 items-center justify-center">
          <View className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent" />
        </View>
      </View>
    )}
  </View>
</ScrollView>

);
}