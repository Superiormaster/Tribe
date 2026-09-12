import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";

export default function ProfilePage() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();

  const username = Array.isArray(params.username)
    ? params.username[0]
    : params.username;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      try {
        const profileData = await apiRequest(
          `api/users/${username}/`
        );

        const postsData = await apiRequest(
          `/api/posts/?author=${username}`
        );

        setProfile(profileData);
        setPosts(postsData);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    load();
  }, [username]);

  if (loading) {
    return <Skeleton />;
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">
        <Text className="text-gray-500 dark:text-gray-400">
          Profile not found.
        </Text>
      </View>
    );
  }

  const openWebsite = async () => {
    if (!profile.website) return;

    try {
      await Linking.openURL(profile.website);
    } catch (err) {
      console.error("Failed to open website:", err);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-950"
      showsVerticalScrollIndicator={false}
    >
      <View className="mx-auto w-full max-w-3xl">
        {/* Cover */}
        <View className="h-44 overflow-hidden bg-gray-200 dark:bg-gray-800">
          {profile.cover_photo ? (
            <Image
              source={{ uri: profile.cover_photo }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : null}
        </View>

        {/* Profile */}
        <View className="px-4">
          {/* Avatar */}
          {profile.avatar ? (
            <Image
              source={{ uri: profile.avatar }}
              className="-mt-12 h-24 w-24 rounded-full border-4 border-white dark:border-gray-950"
              resizeMode="cover"
            />
          ) : (
            <View className="-mt-12 h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-300 dark:border-gray-950 dark:bg-gray-700">
              <Text className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                {profile.display_name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}

          {/* Name */}
          <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {profile.display_name}
          </Text>

          {/* Username */}
          <Text className="text-gray-500 dark:text-gray-400">
            @{profile.username}
          </Text>

          {/* Bio */}
          {profile.bio ? (
            <Text className="mt-2 text-gray-700 dark:text-gray-300">
              {profile.bio}
            </Text>
          ) : null}

          {/* Country / Website */}
          <View className="mt-3 flex-row flex-wrap items-center gap-4">
            {profile.country ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {profile.city
                  ? `${profile.city}, ${profile.country}`
                  : profile.country}
              </Text>
            ) : null}

            {profile.website ? (
              <Pressable
                onPress={openWebsite}
                accessibilityRole="link"
              >
                <Text className="text-sm font-medium text-indigo-600">
                  Website
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Creator Type */}
          {profile.creator_type ? (
            <Text className="mt-2 text-sm text-indigo-600">
              {profile.creator_type}
            </Text>
          ) : null}
        </View>

        {/* Posts */}
        <View className="gap-4 p-4">
          {posts.map((post) => (
            <View
              key={post.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <Text className="text-gray-800 dark:text-gray-200">
                {post.content}
              </Text>
            </View>
          ))}

          {posts.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-gray-500 dark:text-gray-400">
                No posts yet.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}