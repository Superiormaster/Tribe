import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Application from "expo-application";

const KEY = "device_fp";

function randomId(length = 32) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}

export async function getFingerprint(): Promise<string> {
  let fingerprint = await AsyncStorage.getItem(KEY);

  if (fingerprint) {
    return fingerprint;
  }

  const installId = randomId();

  const meta = [
    Device.brand,
    Device.manufacturer,
    Device.modelName,
    Device.osName,
    Device.osVersion,
    Application.applicationId,
  ]
    .filter(Boolean)
    .join("|");

  fingerprint = `${installId}|${meta}`;

  await AsyncStorage.setItem(KEY, fingerprint);

  return fingerprint;
}