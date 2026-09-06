import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

import {
  apiRequest,
  setAccessToken,
} from "@/utils/api";

import {
  getRefreshToken,
  storeRefreshToken,
} from "@/lib/keyStore";

export const switchAccount =
  async (email: string) => {
    await AsyncStorage.setItem(
      "active_account",
      email
    );

    const refresh =
      await getRefreshToken(email);

    if (!refresh) {
      DeviceEventEmitter.emit(
        "auth-changed"
      );

      return;
    }

    const res = await apiRequest(
      "api/users/refresh/",
      {
        method: "POST",
        data: { refresh },
      }
    );

    setAccessToken(res.access);

    if (res.refresh) {
      await storeRefreshToken(
        email,
        res.refresh
      );
    }

    DeviceEventEmitter.emit(
      "auth-changed"
    );
  };