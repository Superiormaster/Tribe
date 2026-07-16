'use client'

import { useEffect, useContext, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiRequest, setAccessToken } from '@/utils/api'
import { saveAccount, getAccounts, setActiveAccount } from '@/utils/accounts'
import { handleOnboardingRedirect } from '@/utils/handleOnboardingRedirect';
import { storeRefreshToken, getRefreshToken } from "@/lib/keyStore"
import { useNavigation } from '@/utils/useNavigation'
import AppLink from '@/components/AppLink';
import { UserContext } from '@/components/UserContext'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const { push } = useNavigation()
  const { user, setUser, loadingUser } = useContext(UserContext)!

  const email = searchParams.get('email')
  const code = searchParams.get('code')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(60)

  useEffect(() => {
    if (!email) return

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email])

  useEffect(() => {
    if (!code) return

    verifyEmail()
  }, [code])

  const verifyEmail = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await apiRequest(
        `api/users/verify-email/?code=${code}`,
        {
          method: 'GET',
        }
      )

      const { access, refresh, user } = res;

      if (res.access) {
        setAccessToken(res.access)
        await storeRefreshToken(res.user.email, res.refresh)
      }
      
      saveAccount(user, "password");
      setActiveAccount(user.email);
      
      const profile = await apiRequest('api/users/me/', {
        method: 'GET',
      })
      setUser(profile)

      setActiveAccount(profile.email)
      saveAccount(profile, profile.auth_provider === "google" ? "google" : "password");

      setMessage('Email verified successfully.')

      setTimeout(async () => {
        await handleOnboardingRedirect(push)
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const resendEmail = async () => {
    if (!email) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await apiRequest(
        'api/users/resend-verification/',
        {
          method: 'POST',
          data: {
            email,
          },
        }
      )

      setMessage(res.message)
      setSeconds(60)
    } catch (err: any) {
      setError(err?.message || 'Unable to resend email.')
    } finally {
      setLoading(false)
    }
  }

  if (code) {
    return (
      <div className="flex justify-center items-center rounded-xl bg-gray-50 dark:bg-gray-950">

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md text-center">

          <h1 className="text-2xl font-bold mb-4">
            Verifying Email
          </h1>

          {loading && (
            <p>Verifying your account...</p>
          )}

          {message && (
            <p className="text-green-600">
              {message}
            </p>
          )}

          {error && (
            <>
              <p className="text-red-600 mb-4">
                {error}
              </p>

              {email && (
                <button
                  onClick={resendEmail}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg"
                >
                  Resend Verification Email
                </button>
              )}
            </>
          )}

        </div>

      </div>
    )
  }

  return (
    <div className="flex justify-center items-center rounded-xl bg-gray-50 dark:bg-gray-950">

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 w-full max-w-md">

        <div className="text-center">

          <div className="text-6xl mb-4">
            📧
          </div>

          <h1 className="text-2xl font-bold">
            Verify your email
          </h1>

          <p className="mt-4 text-gray-500">
            We've sent a verification email to
          </p>

          <p className="font-semibold mt-2 break-all">
            {email}
          </p>

        </div>

        {message && (
          <div className="mt-5 bg-green-100 text-green-700 p-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 bg-red-100 text-red-700 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={() => window.open('https://mail.google.com')}
          className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg"
        >
          Open Gmail
        </button>

        <button
          disabled={seconds > 0 || loading}
          onClick={resendEmail}
          className="w-full mt-3 border border-indigo-600 text-indigo-600 py-3 rounded-lg disabled:opacity-50"
        >
          {seconds > 0
            ? `Resend in ${seconds}s`
            : 'Resend Verification Email'}
        </button>

        <AppLink
          href="/auth/register"
          className="block text-center mt-5 text-indigo-600"
        >
          Change Email Address
        </AppLink>

      </div>

    </div>
  )
}