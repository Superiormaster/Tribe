import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";

const LAST_ACTIVE_KEY = "last_active";
const LAST_SEEN_KEY = "last_seen";

export async function updateActivity() {
  const now = Date.now().toString();

  await AsyncStorage.multiSet([
    [LAST_ACTIVE_KEY, now],
    [LAST_SEEN_KEY, now],
  ]);
}

export function startActivityTracking(
  onInactive?: () => void
) {
  let timer: ReturnType<
    typeof setTimeout
  >;

  const resetTimer = async () => {
    await updateActivity();

    clearTimeout(timer);

    // UI inactivity only (5 minutes)
    timer = setTimeout(() => {
      onInactive?.();
    }, 5 * 60 * 1000);
  };

  const subscription =
    AppState.addEventListener(
      "change",
      async (
        state: AppStateStatus
      ) => {
        if (state === "active") {
          await resetTimer();
        }
      }
    );

  resetTimer();

  return () => {
    subscription.remove();
    clearTimeout(timer);
  };
}

export async function isSessionExpired() {
  const last =
    await AsyncStorage.getItem(
      LAST_SEEN_KEY
    );

  if (!last) return true;

  const diff =
    Date.now() - Number(last);

  const THIRTY_DAYS =
    30 *
    24 *
    60 *
    60 *
    1000;

  return diff > THIRTY_DAYS;
}