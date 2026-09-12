// usePlatform.ts

import { Platform } from "react-native";

export const isNative = Platform.OS === "android" || Platform.OS === "ios";