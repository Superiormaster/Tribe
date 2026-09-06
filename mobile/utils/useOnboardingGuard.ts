import { useEffect } from 'react'
import { useNavigation } from '@/utils/useNavigation'
import { apiRequest } from '@/utils/api'

type Step = 'profile' | 'discover' | 'star'

interface OnboardingStatus {
  profileCompleted: boolean
  discoverCompleted: boolean
  starCompleted: boolean
  completed: boolean
}

export const useOnboardingGuard = (currentStep: Step) => {
  const { replace } = useNavigation()

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const status: OnboardingStatus = await apiRequest(
          'api/users/onboarding-status/'
        )

        if (cancelled) return

        console.log('ONBOARDING STATUS:', status)

        // PROFILE PAGE
        if (currentStep === 'profile') {
          // Only redirect if onboarding is completely finished.
          if (
            status.profileCompleted &&
            status.discoverCompleted &&
            status.starCompleted &&
            status.completed
          ) {
            replace('/main/home')
          }

          return
        }

        // DISCOVER / INTERESTS PAGE
        if (currentStep === 'discover') {
          if (!status.profileCompleted) {
            replace('/auth/profile-setup')
            return
          }

          if (
            status.profileCompleted &&
            status.discoverCompleted
          ) {
            replace('/auth/star')
            return
          }

          return
        }

        // STAR PAGE
        if (currentStep === 'star') {
          if (!status.profileCompleted) {
            replace('/auth/profile-setup')
            return
          }

          if (!status.discoverCompleted) {
            replace('/auth/discover')
            return
          }

          return
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Onboarding guard error:', err)
        }
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [replace, currentStep])
}