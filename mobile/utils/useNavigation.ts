import { useRouter } from "expo-router";
import { useCallback } from "react";

export function useNavigation() {
  const router = useRouter();

  const push = useCallback(
    (url: string) => {
      router.push(url as any);
    },
    [router]
  );

  const replace = useCallback(
    (url: string) => {
      router.replace(url as any);
    },
    [router]
  );

  const back = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  return {
    push,
    replace,
    back,
  };
}