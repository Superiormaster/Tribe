import { useNavigation } from "@/utils/useNavigation";
import { apiRequest } from "@/utils/api";

interface OnboardingStatus {
  profileCompleted: boolean;
  interestsCompleted: boolean;
  starCompleted: boolean;
  completed: boolean;
}

export const handleOnboardingRedirect = async (
  push: (url: string) => void
) => {
  const onboarding: OnboardingStatus = await apiRequest(
    "api/users/onboarding-status/"
  );

  if (onboarding.completed) {
    push("/main/home");
  } else if (!onboarding.profileCompleted) {
    push("/auth/profile-setup");
  } else if (!onboarding.interestsCompleted) {
    push("/auth/interests");
  } else if (!onboarding.starCompleted) {
    push("/auth/star");
  } else {
    push("/main/home");
  }
};