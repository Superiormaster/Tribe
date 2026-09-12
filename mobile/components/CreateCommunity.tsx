import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { useLocalSearchParams } from "expo-router";
import { useNetwork } from "@/components/networkConnection/NetworkContext";

import { apiRequest } from "@/utils/api";
import { normalizeWebsite } from "@/utils/normalizeWebsite";
import { uploadMediaResumable } from "@/utils/mediaUpload/uploadMediaResumable";
import { uploadMedia } from "@/utils/mediaUpload/uploadMedia";
import { useNavigation } from "@/utils/useNavigation";

type Props = {
  onCreated?: () => void;
  user: any;
};

type NativeMediaFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
  });

  return (
    <VideoView
      player={player}
      className="h-48 w-full rounded-lg"
      nativeControls
      contentFit="cover"
    />
  );
}

export default function CreateCommunity({
  onCreated,
  user,
}: Props) {
  const { replace } = useNavigation();
  const { isOnline } = useNetwork();

  const searchParams = useLocalSearchParams<{
    tribe?: string | string[];
  }>();

  const tribeIdParam = Array.isArray(searchParams.tribe)
    ? searchParams.tribe[0]
    : searchParams.tribe;

  const tribeId = tribeIdParam
    ? Number(tribeIdParam)
    : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  const [requireApproval, setRequireApproval] =
    useState(false);

  const [joinApprovalRequired, setJoinApprovalRequired] =
    useState(false);

  const [tribeName, setTribeName] = useState("");
  const [selectedTribe, setSelectedTribe] =
    useState<number | null>(null);

  const [coverFile, setCoverFile] =
    useState<NativeMediaFile | null>(null);

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const [coverProgress, setCoverProgress] = useState(0);
  const [coverUploading, setCoverUploading] = useState(false);

  const [videoFile, setVideoFile] =
    useState<NativeMediaFile | null>(null);

  const [videoPreview, setVideoPreview] =
    useState<string | null>(null);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tribeId) {
      setSelectedTribe(tribeId);
    }
  }, [tribeId]);

  useEffect(() => {
    if (!tribeId) return;

    const loadTribe = async () => {
      if (!isOnline) {
        return;
      }

      try {
        const data = await apiRequest(
          `api/tribes/${tribeId}/`
        );

        setTribeName(data?.name || "");
      } catch (err) {
        console.error(
          "Failed to load tribe:",
          err
        );
      }
    };

    loadTribe();
  }, [tribeId, isOnline]);

  /**
   * Convert Expo ImagePicker asset into the
   * native file shape expected by uploads.
   */
  const createNativeFile = (
    asset: ImagePicker.ImagePickerAsset,
    fallbackType: "image" | "video"
  ): NativeMediaFile => {
    const extension =
      asset.fileName?.split(".").pop() ||
      (fallbackType === "video" ? "mp4" : "jpg");

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

  /**
   * Pick cover image.
   */
  const handleCoverChange = async () => {
    if (loading) return;

    try {
      setError("");

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to select a cover image."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.9,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      const file = createNativeFile(
        asset,
        "image"
      );

      setCoverFile(file);
      setCoverPreview(asset.uri);
      setCoverProgress(0);
    } catch (err) {
      console.error(
        "Failed to select cover:",
        err
      );

      setError(
        "Unable to select the cover image."
      );
    }
  };

  /**
   * Pick intro video.
   */
  const handleVideoChange = async () => {
    if (loading) return;

    try {
      setError("");

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to select a video."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["videos"],
          allowsEditing: false,
          quality: 1,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      const file = createNativeFile(
        asset,
        "video"
      );

      setVideoFile(file);
      setVideoPreview(asset.uri);
      setVideoProgress(0);
    } catch (err) {
      console.error(
        "Failed to select video:",
        err
      );

      setError(
        "Unable to select the intro video."
      );
    }
  };

  const handleCreate = async () => {
    /**
     * NETWORK CHECK
     *
     * Do this before validation/uploads so we don't
     * start an upload when the device is offline.
     */
    if (!isOnline) {
      setError(
        "No internet connection. Please check your connection and try again."
      );
      return;
    }

    if (!name.trim()) {
      setError("Community name is required.");
      return;
    }

    if (!selectedTribe) {
      setError("Please select a tribe.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError("");

    let uploadedCoverAssetId: string | null = null;
    let uploadedVideoAssetId: string | null = null;

    try {
      /**
       * Check network again immediately before
       * starting the cover upload.
       */
      if (!isOnline) {
        throw new Error(
          "No internet connection. Please check your connection and try again."
        );
      }

      /**
       * COVER UPLOAD
       */
      if (coverFile) {
        setCoverUploading(true);
        setCoverProgress(0);

        const uploaded = await uploadMedia(
          coverFile,
          setCoverProgress
        );

        if (!uploaded?.original_url) {
          throw new Error(
            "Cover image upload failed."
          );
        }

        uploadedCoverAssetId =
          uploaded.media_id != null
            ? String(uploaded.media_id)
            : null;

        setCoverProgress(100);
      }

      /**
       * Check network again before video upload.
       */
      if (!isOnline) {
        throw new Error(
          "Internet connection was lost. Please try again."
        );
      }

      /**
       * VIDEO UPLOAD
       */
      if (videoFile) {
        setVideoUploading(true);
        setVideoProgress(0);

        console.log("VIDEO UPLOAD START");

        const uploaded =
          await uploadMediaResumable({
            file: videoFile,
            onProgress: setVideoProgress,
          });

        console.log(
          "VIDEO UPLOAD FINISHED:",
          uploaded
        );

        if (!uploaded?.original_url) {
          throw new Error(
            "Intro video upload failed."
          );
        }

        uploadedVideoAssetId =
          uploaded.media_id != null
            ? String(uploaded.media_id)
            : null;

        setVideoProgress(100);
      }

      /**
       * Check network before creating the
       * community itself.
       */
      if (!isOnline) {
        throw new Error(
          "Internet connection was lost. Please try again."
        );
      }

      /**
       * COMMUNITY PAYLOAD
       */
      const payload: any = {
        name: name.trim(),

        description:
          description.trim(),

        website:
          normalizeWebsite(website),

        require_post_approval:
          requireApproval,

        join_approval_required:
          joinApprovalRequired,

        tribe: selectedTribe,
      };

      if (uploadedCoverAssetId) {
        payload.cover_image_asset_id =
          uploadedCoverAssetId;
      }

      if (uploadedVideoAssetId) {
        payload.intro_video_asset_id =
          uploadedVideoAssetId;
      }

      console.log(
        "Creating community with media:",
        payload
      );

      console.log(
        "ABOUT TO CREATE COMMUNITY"
      );

      const createdCommunity =
        await apiRequest(
          "api/communities/",
          {
            method: "POST",
            data: payload,
          }
        );

      console.log(
        "COMMUNITY CREATED:",
        createdCommunity
      );

      if (createdCommunity?.id) {
        replace(
          `/main/community/${createdCommunity.id}`
        );
      }

      /**
       * Reset form.
       */
      setName("");
      setDescription("");
      setWebsite("");

      setCoverFile(null);
      setCoverPreview(null);
      setCoverProgress(0);

      setVideoFile(null);
      setVideoPreview(null);
      setVideoProgress(0);

      setRequireApproval(false);
      setJoinApprovalRequired(false);

      setSelectedTribe(null);

      onCreated?.();
    } catch (err: any) {
      console.error(
        "Failed to create community:",
        err
      );

      /**
       * Use NetworkContext instead of navigator.onLine.
       */
      if (!isOnline) {
        setError(
          "Internet connection was lost. Please check your connection and try again."
        );
      } else {
        setError(
          err?.message ||
            "Failed to create community. Please try again."
        );
      }
    } finally {
      setCoverUploading(false);
      setVideoUploading(false);
      setLoading(false);
    }
  };

  const createDisabled =
    loading ||
    coverUploading ||
    videoUploading ||
    !isOnline;

  return (
    <ScrollView
      className="flex-1 bg-gray-100 dark:bg-gray-950"
      contentContainerClassName="px-4 pb-10 pt-20"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        {/* OFFLINE STATUS */}

        {!isOnline ? (
          <View className="mb-4 rounded-lg bg-red-100 px-4 py-3 dark:bg-red-900/30">
            <Text className="text-center text-sm font-medium text-red-600 dark:text-red-400">
              You're offline. Connect to the internet
              to create a community.
            </Text>
          </View>
        ) : null}

        {/* TITLE */}

        <Text className="mb-4 text-center text-2xl font-bold text-gray-700 dark:text-gray-300">
          Create Community
          {tribeName
            ? ` in ${tribeName} Tribe`
            : ""}
        </Text>

        {/* ERROR */}

        {error ? (
          <View className="mb-4 rounded-lg bg-red-100 px-4 py-3 dark:bg-red-900/30">
            <Text className="text-sm text-red-600 dark:text-red-400">
              {error}
            </Text>
          </View>
        ) : null}

        {/* COMMUNITY NAME */}

        <TextInput
          value={name}
          onChangeText={setName}
          editable={!loading}
          placeholder="Community Name"
          placeholderTextColor="#9ca3af"
          className="mb-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        {/* DESCRIPTION */}

        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!loading}
          placeholder="Description"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="mb-2 min-h-[110px] rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        {/* WEBSITE */}

        <TextInput
          value={website}
          onChangeText={setWebsite}
          editable={!loading}
          placeholder="Enter community website"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="mb-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        {/* POST APPROVAL */}

        <View className="mb-2 flex-row items-center justify-between">
          <Text className="flex-1 text-gray-700 dark:text-gray-300">
            Require post approval
          </Text>

          <Switch
            value={requireApproval}
            onValueChange={setRequireApproval}
            disabled={loading}
          />
        </View>

        {/* JOIN APPROVAL */}

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="flex-1 text-gray-700 dark:text-gray-300">
            Require join approval
          </Text>

          <Switch
            value={joinApprovalRequired}
            onValueChange={
              setJoinApprovalRequired
            }
            disabled={loading}
          />
        </View>

        {/* COVER */}

        <View className="mb-5">
          <Text className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
            Cover Image
          </Text>

          <Pressable
            onPress={handleCoverChange}
            disabled={createDisabled}
            className="overflow-hidden rounded-xl border-2 border-dashed border-gray-300 p-4 dark:border-gray-700"
          >
            {coverPreview ? (
              <Image
                source={{ uri: coverPreview }}
                className="h-48 w-full rounded-lg"
                resizeMode="cover"
              />
            ) : (
              <View className="items-center justify-center py-10">
                <Text className="text-center text-gray-500">
                  Tap here to select a cover image
                </Text>
              </View>
            )}
          </Pressable>

          {coverUploading ? (
            <View className="mt-2">
              <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <View
                  className="h-2 rounded-full bg-indigo-600"
                  style={{
                    width: `${coverProgress}%`,
                  }}
                />
              </View>

              <Text className="mt-1 text-center text-xs text-gray-600 dark:text-gray-400">
                Uploading cover...{" "}
                {coverProgress}%
              </Text>
            </View>
          ) : null}
        </View>

        {/* VIDEO */}

        <View className="mb-5">
          <Text className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
            Intro Video
          </Text>

          <Pressable
            onPress={handleVideoChange}
            disabled={createDisabled}
            className="overflow-hidden rounded-xl border-2 border-dashed border-gray-300 p-4 dark:border-gray-700"
          >
            {videoPreview ? (
              <VideoPreview
                uri={videoPreview}
              />
            ) : (
              <View className="items-center justify-center py-10">
                <Text className="text-center text-gray-500">
                  Tap here to select an intro video
                </Text>
              </View>
            )}
          </Pressable>

          {videoUploading ? (
            <View className="mt-2">
              <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <View
                  className="h-2 rounded-full bg-green-600"
                  style={{
                    width: `${videoProgress}%`,
                  }}
                />
              </View>

              <Text className="mt-1 text-center text-xs text-gray-600 dark:text-gray-400">
                Uploading intro video...{" "}
                {videoProgress}%
              </Text>
            </View>
          ) : null}
        </View>

        {/* CREATE */}

        <Pressable
          onPress={handleCreate}
          disabled={createDisabled}
          className={`mt-3 w-full rounded-lg px-4 py-3 ${
            createDisabled
              ? "bg-indigo-400"
              : "bg-indigo-600"
          }`}
        >
          <Text className="text-center font-semibold text-white">
            {!isOnline
              ? "Waiting for connection..."
              : coverUploading
              ? `Uploading Cover... ${coverProgress}%`
              : videoUploading
              ? `Uploading Video... ${videoProgress}%`
              : loading
              ? "Creating..."
              : "Create Community"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}