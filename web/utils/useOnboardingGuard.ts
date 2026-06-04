'use client'

import { useEffect } from 'react'
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from '@/utils/api'

type Step = 'profile' | 'interests' | 'star'

interface OnboardingStatus {
  profileCompleted: boolean
  interestsCompleted: boolean
  starCompleted: boolean
  completed: boolean
}

export const useOnboardingGuard = (currentStep: Step) => {
  const { replace } = useNavigation()

  useEffect(() => {
    const check = async () => {
      try {
        const status: OnboardingStatus = await apiRequest(
          'api/users/onboarding-status/'
        )

        console.log('ONBOARDING STATUS:', status)

        // PROFILE PAGE
        if (currentStep === 'profile') {

          // only redirect if EVERYTHING truly done
          if (
            status.profileCompleted &&
            status.interestsCompleted &&
            status.starCompleted &&
            status.completed
          ) {
            replace('/main/home')
          }

          return
        }

        // INTERESTS PAGE
        if (currentStep === 'interests') {

          if (!status.profileCompleted) {
            replace('/auth/profile-setup')
            return
          }

          if (
            status.profileCompleted &&
            status.interestsCompleted
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

          if (!status.interestsCompleted) {
            replace('/auth/interests')
            return
          }

          return
        }

      } catch (err) {
        console.error('Onboarding guard error:', err)
      }
    }

    check()
  }, [replace, currentStep])
}