'use client';

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import {
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
  Plus,
} from "lucide-react-native";

import { apiRequest } from "@/utils/api";
import { useNavigation } from "@/utils/useNavigation";
import PermanentMediaTypeModal from "@/components/community/PermanentMediaTypeModal";
import {
  uploadMediaResumable,
} from "@/utils/mediaUpload/uploadMediaResumable";
import { uploadMedia } from "@/utils/mediaUpload/uploadMedia";
import { useNetwork } from "@/components/networkConnection/NetworkContext";

type NativeMediaFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

type Props = {
  communityId: string;
};

export default function CommunitySettingsPage({
  communityId,
}: Props) {
  const [community, setCommunity] = useState<any>({
    moderators: [],
    owner: {},
    admin: {},
  });

  const { replace } = useNavigation();
  const { isOnline } = useNetwork();

  const [loading, setLoading] = useState(true);

  const [showMediaWarning, setShowMediaWarning] =
    useState(false);

  const [pendingValue, setPendingValue] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [isPlaying, setIsPlaying] =
    useState(true);

  const [isMuted, setIsMuted] =
    useState(true);

  const [coverFile, setCoverFile] =
    useState<NativeMediaFile | null>(null);

  const [videoFile, setVideoFile] =
    useState<NativeMediaFile | null>(null);

  const [coverUrl, setCoverUrl] =
    useState("");

  const [videoUrl, setVideoUrl] =
    useState("");

  const [coverAssetId, setCoverAssetId] =
    useState<string | null>(null);

  const [videoAssetId, setVideoAssetId] =
    useState<string | null>(null);

  const [coverUploading, setCoverUploading] =
    useState(false);

  const [videoUploading, setVideoUploading] =
    useState(false);

  const [coverProgress, setCoverProgress] =
    useState(0);

  const [videoProgress, setVideoProgress] =
    useState(0);

  const [permissions, setPermissions] = useState({
    allow_reels: false,
    allow_videos: true,
  });

  /*
   * ---------------------------------------------------------
   * VIDEO PLAYER
   * ---------------------------------------------------------
   */

  const videoSource =
    community.intro_video_url || "";

  const videoPlayer = useVideoPlayer(
    videoSource || null,
    (player) => {
      player.loop = true;
      player.muted = true;

      if (videoSource) {
        player.play();
      }
    }
  );

  /*
   * ---------------------------------------------------------
   * LOAD SETTINGS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    load();
  }, [communityId, isOnline]);

  const load = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(
        `api/communities/${communityId}/settings/`
      );

      setCommunity(data);

      setPermissions(
        data.permissions || {
          allow_reels: false,
          allow_videos: true,
        }
      );

      setCoverUrl(
        data.cover_image_url || ""
      );

      setVideoUrl(
        data.intro_video_url || ""
      );

      setCoverAssetId(
        data.cover_image_asset_id || null
      );

      setVideoAssetId(
        data.intro_video_asset_id || null
      );
    } catch (error) {
      console.error(
        "Failed to load community settings:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * PLAY / PAUSE
   * ---------------------------------------------------------
   */

  const toggleVideoPlayback = () => {
    if (!videoSource) return;

    if (isPlaying) {
      videoPlayer.pause();
    } else {
      videoPlayer.play();
    }

    setIsPlaying((prev) => !prev);
  };

  /*
   * ---------------------------------------------------------
   * MUTE / UNMUTE
   * ---------------------------------------------------------
   */

  const toggleMute = () => {
    const nextMuted = !isMuted;

    videoPlayer.muted = nextMuted;

    setIsMuted(nextMuted);
  };

  /*
   * ---------------------------------------------------------
   * RESTART VIDEO
   * ---------------------------------------------------------
   */

  const restartVideo = () => {
    if (!videoSource) return;

    videoPlayer.currentTime = 0;
    videoPlayer.play();

    setIsPlaying(true);
  };

  /*
   * ---------------------------------------------------------
   * DELETE COMMUNITY
   * ---------------------------------------------------------
   */

  async function deleteCommunity(id: number) {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "You need an internet connection to delete this community."
      );
      return;
    }

    Alert.alert(
      "Delete Community",
      "Delete this community?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(
                `api/communities/${id}/delete/`,
                {
                  method: "DELETE",
                }
              );

              replace("/main/tribe");
            } catch (err) {
              console.error(err);

              Alert.alert(
                "Error",
                "Failed to delete community."
              );
            }
          },
        },
      ]
    );
  }

  /*
   * ---------------------------------------------------------
   * UPDATE SETTINGS
   * ---------------------------------------------------------
   */

  const updateSettings = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "You need an internet connection to save community settings."
      );
      return;
    }

    try {
      setSaving(true);

      console.log(
        "COMMUNITY MEDIA IDS:",
        {
          coverAssetId,
          videoAssetId,
        }
      );

      await apiRequest(
        `api/communities/${communityId}/settings/`,
        {
          method: "PATCH",
          data: {
            name: community.name,
            description: community.description,

            cover_image_asset_id:
              coverAssetId,

            intro_video_asset_id:
              videoAssetId,

            rules: community.rules || "",

            website: community.website,

            require_post_approval:
              community.require_post_approval,

            join_approval_required:
              community.join_approval_required,

            allow_videos:
              permissions.allow_videos,
          },
        }
      );

      replace(
        `/main/community/${communityId}`
      );
    } catch (err) {
      console.error(
        "Failed to save community settings:",
        err
      );

      Alert.alert(
        "Error",
        "Failed to save community settings."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CREATE NATIVE MEDIA FILE
   * ---------------------------------------------------------
   */

  const createNativeFile = (
    asset: ImagePicker.ImagePickerAsset,
    fallbackType: "image" | "video"
  ): NativeMediaFile => {
    const extension =
      asset.fileName?.split(".").pop() ||
      (fallbackType === "video"
        ? "mp4"
        : "jpg");

    const type =
      asset.mimeType ||
      `${fallbackType}/${extension}`;

    return {
      uri: asset.uri,
      name:
        asset.fileName ||
        `${fallbackType}-${Date.now()}.${extension}`,
      type,
      size: asset.fileSize || 0,
    };
  };

  /*
   * ---------------------------------------------------------
   * PICK VIDEO
   * ---------------------------------------------------------
   */

  const handleVideoUpload = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "You need an internet connection to upload a video."
      );
      return;
    }

    if (videoUploading) return;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["videos"],
          allowsEditing: false,
          quality: 1,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];

      const file = createNativeFile(
        asset,
        "video"
      );

      const previousVideo =
        videoUrl ||
        community.intro_video ||
        community.intro_video_url ||
        "";

      setVideoFile(file);

      /*
       * Native preview uses the selected file URI.
       */
      setCommunity((prev: any) => ({
        ...prev,
        intro_video_url: file.uri,
      }));

      setVideoUploading(true);
      setVideoProgress(0);

      try {
        if (!isOnline) {
          throw new Error(
            "Connection lost during video upload."
          );
        }

        const uploaded =
          await uploadMediaResumable({
            file,
            onProgress: setVideoProgress,
          });

        const uploadedUrl =
          Array.isArray(
            uploaded?.original_url
          )
            ? uploaded?.original_url[0] ?? ""
            : uploaded?.original_url;

        if (!uploadedUrl) {
          throw new Error(
            "Video upload did not return a valid URL."
          );
        }

        setVideoAssetId(
          uploaded.media_id != null
            ? String(uploaded.media_id)
            : null
        );

        setVideoUrl(uploadedUrl);

        setCommunity((prev: any) => ({
          ...prev,
          intro_video_url: uploadedUrl,
        }));
      } catch (error) {
        console.error(
          "Community intro video upload failed:",
          error
        );

        setCommunity((prev: any) => ({
          ...prev,
          intro_video_url: previousVideo,
        }));

        setVideoProgress(0);

        Alert.alert(
          "Video Upload Failed",
          error instanceof Error
            ? error.message
            : "Failed to upload intro video."
        );
      } finally {
        setVideoUploading(false);
        setVideoFile(null);
      }
    } catch (error) {
      console.error(
        "Video picker failed:",
        error
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * PICK COVER IMAGE
   * ---------------------------------------------------------
   */

  const handleCoverUpload = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "You need an internet connection to upload a cover image."
      );
      return;
    }

    if (coverUploading) return;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.9,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];

      const file = createNativeFile(
        asset,
        "image"
      );

      const previousCover =
        coverUrl ||
        community.cover_image_url ||
        "";

      setCoverFile(file);

      /*
       * Native local preview.
       */
      setCommunity((prev: any) => ({
        ...prev,
        cover_image_url: file.uri,
      }));

      setCoverUploading(true);
      setCoverProgress(0);

      try {
        if (!isOnline) {
          throw new Error(
            "Connection lost during cover upload."
          );
        }

        const uploaded =
          await uploadMedia(
            file,
            setCoverProgress
          );

        const uploadedUrl =
          Array.isArray(
            uploaded?.original_url
          )
            ? uploaded?.original_url[0] ?? ""
            : uploaded?.original_url;

        if (!uploadedUrl) {
          throw new Error(
            "Cover upload did not return a valid URL."
          );
        }

        setCoverAssetId(
          uploaded.media_id != null
            ? String(uploaded.media_id)
            : null
        );

        setCoverUrl(uploadedUrl);

        setCommunity((prev: any) => ({
          ...prev,
          cover_image_url: uploadedUrl,
        }));
      } catch (error) {
        console.error(
          "Community cover upload failed:",
          error
        );

        setCommunity((prev: any) => ({
          ...prev,
          cover_image_url: previousCover,
        }));

        setCoverProgress(0);

        Alert.alert(
          "Cover Upload Failed",
          error instanceof Error
            ? error.message
            : "Failed to upload cover image."
        );
      } finally {
        setCoverUploading(false);
        setCoverFile(null);
      }
    } catch (error) {
      console.error(
        "Cover picker failed:",
        error
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator
          size="large"
          color="#4f46e5"
        />
      </View>
    );
  }

  /*
   * ---------------------------------------------------------
   * OFFLINE
   * ---------------------------------------------------------
   */

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      {!isOnline && (
        <View className="bg-red-500 px-4 py-2">
          <Text className="text-center text-sm font-medium text-white">
            You are offline. Changes and uploads are disabled.
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-xl">
          <Text className="text-2xl font-bold text-gray-700 dark:text-white">
            Community Settings
          </Text>

          {/* ------------------------------------------------ */}
          {/* INTRO VIDEO                                      */}
          {/* ------------------------------------------------ */}

          <View className="mt-5">
            <View className="relative h-72 w-full overflow-hidden rounded-lg border border-gray-300 bg-black">
              {community.intro_video_url ? (
                <VideoView
                  player={videoPlayer}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  contentFit="cover"
                  nativeControls={false}
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-black">
                  <Text className="text-gray-400">
                    No intro video
                  </Text>
                </View>
              )}

              <View className="absolute bottom-3 right-3 flex-row gap-2">
                <Pressable
                  onPress={toggleVideoPlayback}
                  className="h-9 w-9 items-center justify-center rounded-full bg-black/60"
                >
                  {isPlaying ? (
                    <Pause
                      size={14}
                      color="#ffffff"
                    />
                  ) : (
                    <Play
                      size={14}
                      color="#ffffff"
                    />
                  )}
                </Pressable>

                <Pressable
                  onPress={toggleMute}
                  className="h-9 w-9 items-center justify-center rounded-full bg-black/60"
                >
                  {isMuted ? (
                    <VolumeX
                      size={14}
                      color="#ffffff"
                    />
                  ) : (
                    <Volume2
                      size={14}
                      color="#ffffff"
                    />
                  )}
                </Pressable>

                <Pressable
                  onPress={restartVideo}
                  className="h-9 w-9 items-center justify-center rounded-full bg-black/60"
                >
                  <Repeat
                    size={14}
                    color="#ffffff"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleVideoUpload}
              disabled={
                videoUploading ||
                !isOnline
              }
              className={`mt-3 h-10 w-10 items-center justify-center self-end rounded-full ${
                videoUploading ||
                !isOnline
                  ? "bg-indigo-400"
                  : "bg-indigo-600"
              }`}
            >
              <Plus
                size={20}
                color="#ffffff"
              />
            </Pressable>
          </View>

          {/* VIDEO PROGRESS */}

          {videoProgress > 0 &&
            videoProgress < 100 && (
              <View className="mt-3">
                <View className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <View
                    className="h-full bg-indigo-600"
                    style={{
                      width: `${videoProgress}%`,
                    }}
                  />
                </View>

                <Text className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
                  Uploading video...{" "}
                  {videoProgress}%
                </Text>
              </View>
            )}

          {/* ------------------------------------------------ */}
          {/* COVER                                             */}
          {/* ------------------------------------------------ */}

          <View className="mt-5 flex-row items-center gap-3">
            <View className="relative h-16 w-16">
              {community.cover_image_url ? (
                <Image
                  source={{
                    uri: community.cover_image_url,
                  }}
                  className="h-16 w-16 rounded-full border border-gray-300"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
              )}

              {coverProgress > 0 &&
                coverProgress < 100 && (
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-black/50">
                    <Text className="text-xs font-bold text-white">
                      {coverProgress}%
                    </Text>
                  </View>
                )}
            </View>

            <Pressable
              onPress={handleCoverUpload}
              disabled={
                coverUploading ||
                !isOnline
              }
              className={`h-10 w-10 items-center justify-center rounded-full ${
                coverUploading ||
                !isOnline
                  ? "bg-indigo-400"
                  : "bg-indigo-600"
              }`}
            >
              <Plus
                size={20}
                color="#ffffff"
              />
            </Pressable>
          </View>

          {/* ------------------------------------------------ */}
          {/* NAME                                              */}
          {/* ------------------------------------------------ */}

          <View className="mt-6">
            <Text className="mb-2 text-xl font-medium text-gray-700 dark:text-white">
              Name
            </Text>

            <TextInput
              value={community.name || ""}
              onChangeText={(text) =>
                setCommunity({
                  ...community,
                  name: text,
                })
              }
              editable={isOnline}
              className="rounded border border-gray-300 bg-indigo-100 p-3 text-gray-700 dark:border-gray-700 dark:bg-indigo-950 dark:text-white"
              placeholder="Community name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* ------------------------------------------------ */}
          {/* DESCRIPTION                                       */}
          {/* ------------------------------------------------ */}

          <View className="mt-5">
            <Text className="mb-2 text-xl font-medium text-gray-700 dark:text-white">
              Description
            </Text>

            <TextInput
              value={
                community.description || ""
              }
              onChangeText={(text) =>
                setCommunity({
                  ...community,
                  description: text,
                })
              }
              editable={isOnline}
              multiline
              textAlignVertical="top"
              className="min-h-[110px] rounded border border-gray-300 bg-indigo-100 p-3 text-gray-700 dark:border-gray-700 dark:bg-indigo-950 dark:text-white"
              placeholder="Community description"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* ------------------------------------------------ */}
          {/* COMMUNITY RULES                                   */}
          {/* ------------------------------------------------ */}

          <View className="mt-5">
            <Text className="text-xl font-medium text-gray-700 dark:text-white">
              Community Rules
            </Text>

            <Text className="mb-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              Write one rule per line. Numbering will be added automatically.
            </Text>

            <TextInput
              value={community.rules || ""}
              onChangeText={(text) =>
                setCommunity({
                  ...community,
                  rules: text,
                })
              }
              editable={isOnline}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder={
                "Be respectful to other members.\nNo spam or self-promotion.\nKeep discussions relevant."
              }
              placeholderTextColor="#9ca3af"
              className="min-h-[140px] rounded border border-gray-300 bg-indigo-100 p-3 text-gray-700 dark:border-gray-700 dark:bg-indigo-950 dark:text-white"
            />
          </View>

          {/* ------------------------------------------------ */}
          {/* WEBSITE                                           */}
          {/* ------------------------------------------------ */}

          <View className="mt-5">
            <Text className="mb-2 text-xl font-medium text-gray-700 dark:text-white">
              Website
            </Text>

            <TextInput
              value={
                community.website || ""
              }
              onChangeText={(text) =>
                setCommunity({
                  ...community,
                  website: text,
                })
              }
              editable={isOnline}
              autoCapitalize="none"
              keyboardType="url"
              className="rounded border border-gray-300 bg-indigo-100 p-3 text-gray-700 dark:border-gray-700 dark:bg-indigo-950 dark:text-white"
              placeholder="https://example.com"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* ------------------------------------------------ */}
          {/* APPROVAL                                          */}
          {/* ------------------------------------------------ */}

          <View className="mt-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-gray-700 dark:text-gray-200">
                Require Post Approval
              </Text>

              <Switch
                value={
                  !!community.require_post_approval
                }
                onValueChange={(value) =>
                  setCommunity({
                    ...community,
                    require_post_approval:
                      value,
                  })
                }
                disabled={!isOnline}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-gray-700 dark:text-gray-200">
                Require Join Approval
              </Text>

              <Switch
                value={
                  !!community.join_approval_required
                }
                onValueChange={(value) =>
                  setCommunity({
                    ...community,
                    join_approval_required:
                      value,
                  })
                }
                disabled={!isOnline}
              />
            </View>
          </View>

          {/* ------------------------------------------------ */}
          {/* VIDEO / REELS                                     */}
          {/* ------------------------------------------------ */}

          {permissions.allow_reels && (
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="flex-1 text-gray-700 dark:text-gray-200">
                Allow Videos Instead of Reels
              </Text>

              <Switch
                value={
                  permissions.allow_videos
                }
                onValueChange={(checked) => {
                  if (checked) {
                    setPendingValue(true);
                    setShowMediaWarning(true);
                  } else {
                    setPermissions({
                      ...permissions,
                      allow_videos: false,
                    });
                  }
                }}
                disabled={!isOnline}
              />
            </View>
          )}

          {/* ------------------------------------------------ */}
          {/* OWNER                                             */}
          {/* ------------------------------------------------ */}

          <Text className="mt-6 text-gray-700 dark:text-gray-200">
            Owner:{" "}
            {community.owner?.username}
          </Text>

          {/* ------------------------------------------------ */}
          {/* ADMIN                                             */}
          {/* ------------------------------------------------ */}

          <Text className="mt-2 text-gray-700 dark:text-gray-200">
            Admin:{" "}
            {community.admin?.username}
          </Text>

          {/* ------------------------------------------------ */}
          {/* MODERATORS                                        */}
          {/* ------------------------------------------------ */}

          <View className="mt-5">
            <Text className="text-gray-700 dark:text-gray-200">
              Moderators (
              {community.moderators?.length ||
                0}
              /5)
            </Text>

            {community.moderators?.map(
              (m: any) => (
                <Text
                  key={m.id}
                  className="mt-1 text-gray-500 dark:text-gray-400"
                >
                  {m.username}
                </Text>
              )
            )}
          </View>

          {/* ------------------------------------------------ */}
          {/* SAVE                                              */}
          {/* ------------------------------------------------ */}

          <Pressable
            onPress={updateSettings}
            disabled={
              saving ||
              coverUploading ||
              videoUploading ||
              !isOnline
            }
            className={`mt-7 w-full rounded p-3 ${
              saving ||
              coverUploading ||
              videoUploading ||
              !isOnline
                ? "bg-blue-400"
                : "bg-blue-500"
            }`}
          >
            <Text className="text-center font-medium text-white">
              {coverUploading
                ? `Uploading Cover... ${coverProgress}%`
                : videoUploading
                ? `Uploading Video... ${videoProgress}%`
                : saving
                ? "Saving..."
                : !isOnline
                ? "Waiting for connection..."
                : "Save Changes"}
            </Text>
          </Pressable>

          {/* ------------------------------------------------ */}
          {/* DELETE                                            */}
          {/* ------------------------------------------------ */}

          <Pressable
            onPress={() =>
              deleteCommunity(
                community.id
              )
            }
            disabled={!isOnline}
            className={`mt-4 w-full rounded p-3 ${
              !isOnline
                ? "bg-red-300"
                : "bg-red-500"
            }`}
          >
            <Text className="text-center font-medium text-white">
              Delete Community
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ---------------------------------------------------- */}
      {/* MEDIA WARNING                                        */}
      {/* ---------------------------------------------------- */}

      <PermanentMediaTypeModal
        open={showMediaWarning}
        onCancel={() => {
          setShowMediaWarning(false);
          setPendingValue(false);
        }}
        onConfirm={() => {
          setPermissions({
            ...permissions,
            allow_videos: pendingValue,
          });

          setShowMediaWarning(false);
        }}
      />
    </View>
  );
}