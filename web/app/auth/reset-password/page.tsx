'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { apiRequest } from '@/utils/api'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token || !uid) {
      setError('Invalid or missing token')
      return
    }

    setLoading(true)

    try {
      await apiRequest('api/users/reset-password/', {
        method: 'POST',
        data: { password, uid },
      })

      setMessage(data.message);
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center rounded-2xl bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleReset}
        className="bg-white dark:bg-gray-900 py-3 px-5 rounded-2xl shadow-xl w-96 space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reset Password
        </h1>

        {message && (
          <div className="bg-green-100 text-green-600 px-3 py-2 rounded-lg text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* New Password */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-gray-600 dark:text-gray-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-2 text-gray-600 dark:text-gray-300"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <p className="text-sm text-gray-500 text-center">
          Remembered your password?{' '}
          <a href="/auth/login" className="text-indigo-600 ml-1">
            Login
          </a>
        </p>
      </form>
    </div>
  )
}