import { DeviceEventEmitter } from "react-native";

export function updateSocketAccessToken(
accessToken: string
) {
DeviceEventEmitter.emit(
"access-token-refreshed",
{
accessToken,
}
);
}