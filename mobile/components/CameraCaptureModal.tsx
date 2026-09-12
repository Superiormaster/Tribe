import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import {
  Camera,
  X,
  Send,
  RotateCcw,
} from "lucide-react-native";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

type NativeCameraFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

type Props = {
  onClose: () => void;
  onCapture: (file: NativeCameraFile) => void;
};

export default function CameraCaptureModal({
  onClose,
  onCapture,
}: Props) {
  const cameraRef =
    useRef<CameraView | null>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [preview, setPreview] =
    useState<string | null>(null);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [capturing, setCapturing] =
    useState(false);

  useEffect(() => {
    if (!permission) return;

    if (!permission.granted) {
      requestPermission();
    }
  }, [
    permission,
    requestPermission,
  ]);

  const handleClose = () => {
    setPreview(null);
    setCameraReady(false);
    onClose();
  };

  const takePhoto = async () => {
    if (
      !cameraRef.current ||
      !cameraReady ||
      capturing
    ) {
      return;
    }

    try {
      setCapturing(true);

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });

      if (!photo?.uri) {
        throw new Error(
          "Camera did not return a photo."
        );
      }

      setPreview(photo.uri);
    } catch (error) {
      console.error(
        "Camera capture failed:",
        error
      );

      Alert.alert(
        "Camera Error",
        "Unable to capture the photo. Please try again."
      );
    } finally {
      setCapturing(false);
    }
  };

  const retakePhoto = () => {
    setPreview(null);
    setCameraReady(false);
  };

  const sendPhoto = async () => {
    if (!preview) return;

    try {
      const file: NativeCameraFile = {
        uri: preview,
        name: `camera-${Date.now()}.jpg`,
        type: "image/jpeg",

        size: 0,
      };

      onCapture(file);
      handleClose();
    } catch (error) {
      console.error(
        "Sending camera photo failed:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to use this photo."
      );
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Camera
          size={48}
          color="#ffffff"
        />

        <Text className="mt-4 text-center text-lg font-semibold text-white">
          Camera permission is required
        </Text>

        <Text className="mt-2 text-center text-gray-400">
          Allow Tribe to access your camera
          to take photos.
        </Text>

        <Pressable
          onPress={requestPermission}
          className="mt-6 rounded-xl bg-indigo-600 px-6 py-3"
        >
          <Text className="font-semibold text-white">
            Allow Camera
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="mt-3 px-6 py-3"
        >
          <Text className="text-gray-300">
            Cancel
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* TOP BAR */}
      <View className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between p-4">
        <Pressable
          onPress={handleClose}
          className="h-12 w-12 items-center justify-center"
          hitSlop={10}
        >
          <X
            size={28}
            color="#ffffff"
          />
        </Pressable>
      </View>

      {/* CONTENT */}
      <View className="flex-1 items-center justify-center overflow-hidden">
        {!preview ? (
          <CameraView
            ref={cameraRef}
            style={{
              width: "100%",
              height: "100%",
            }}
            facing="back"
            mode="picture"
            onCameraReady={() =>
              setCameraReady(true)
            }
          />
        ) : (
          <Image
            source={{
              uri: preview,
            }}
            className="h-full w-full"
            resizeMode="contain"
          />
        )}
      </View>

      {/* CONTROLS */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-center gap-8 p-6">
        {!preview ? (
          <Pressable
            onPress={takePhoto}
            disabled={
              !cameraReady || capturing
            }
            className={`h-20 w-20 items-center justify-center rounded-full border-4 border-white ${
              !cameraReady || capturing
                ? "opacity-50"
                : ""
            }`}
          >
            <View className="h-14 w-14 rounded-full bg-white" />
          </Pressable>
        ) : (
          <>
            {/* RETAKE */}
            <Pressable
              onPress={retakePhoto}
              className="h-14 w-14 items-center justify-center rounded-full bg-white/20"
            >
              <RotateCcw
                size={24}
                color="#ffffff"
              />
            </Pressable>

            {/* SEND */}
            <Pressable
              onPress={sendPhoto}
              className="h-16 w-16 items-center justify-center rounded-full bg-indigo-600"
            >
              <Send
                size={26}
                color="#ffffff"
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}