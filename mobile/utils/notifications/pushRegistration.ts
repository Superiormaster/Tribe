import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import { apiRequest } from "@/utils/api";

let tokenPromise: Promise<string | null> | null = null;

export async function getFCMToken(): Promise<
string | null

«{
try {
if (tokenPromise) {
return tokenPromise;
}»

tokenPromise = (async () => {
  const messagingInstance =
    messaging();

  await messagingInstance.registerDeviceForRemoteMessages();

  /*
   * Native FCM registration token.
   */
  const token =
    await messagingInstance.getToken();

  if (!token) {
    return null;
  }

  return token;
})().finally(() => {
  tokenPromise = null;
});

return tokenPromise;

} catch (error) {
console.error(
"[Push] Failed to get FCM token:",
error
);

return null;

}
}

/**

* Register the native FCM token with Django.
  */
  export async function registerPushToken() {
  const token =
  await getFCMToken();

if (!token) {
return null;
}

await apiRequest(
"api/users/fcm-token/",
{
method: "POST",
data: {
token,
platform: Platform.OS,
browser: "",
},
}
);

return token;
}

export function onFCMTokenRefresh(
callback: (token: string) => void
) {
return messaging().onTokenRefresh(
callback
);
}