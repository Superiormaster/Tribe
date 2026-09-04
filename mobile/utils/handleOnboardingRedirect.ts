import { apiRequest } from "@/utils/api";

interface OnboardingStatus {
  profileCompleted: boolean;
  discoverCompleted: boolean;
  starCompleted: boolean;
  completed: boolean;
}

type Navigate = (route: string) => void;

export async function handleOnboardingRedirect(
  push: Navigate
) {
  try {
    const onboarding: OnboardingStatus =
      await apiRequest(
        "api/users/onboarding-status/"
      );

    if (onboarding.completed) {
      push("/main/home");
      return;
    }

    if (!onboarding.profileCompleted) {
      push("/auth/profile-setup");
      return;
    }

    if (!onboarding.discoverCompleted) {
      push("/auth/discover");
      return;
    }

    if (!onboarding.starCompleted) {
      push("/auth/star");
      return;
    }

    push("/main/home");
  } catch (error) {
    console.error(
      "Failed to load onboarding status",
      error
    );

    // Optional fallback
    push("/auth/login");
  }
}