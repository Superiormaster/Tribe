export function updateSocketAccessToken(
  accessToken: string
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      "access-token-refreshed",
      {
        detail: {
          accessToken,
        },
      }
    )
  );
}