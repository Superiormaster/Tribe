import * as ImagePicker from "expo-image-picker";

// Pick images
const pickImages = async () => {
  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
    });

  if (!result.canceled) {
    handleImagesChange(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name:
          asset.fileName ??
          undefined,
        type:
          asset.mimeType ??
          undefined,
        size:
          asset.fileSize ??
          undefined,
      }))
    );
  }
};

// Pick video
const pickVideo = async () => {
  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
    });

  if (!result.canceled) {
    const asset =
      result.assets[0];

    handleVideoChange({
      uri: asset.uri,
      name:
        asset.fileName ??
        undefined,
      type:
        asset.mimeType ??
        undefined,
      size:
        asset.fileSize ??
        undefined,
    });
  }
};