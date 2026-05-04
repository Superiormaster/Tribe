'use client'

import { useState } from 'react'
import { apiRequest } from '@/utils/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const data = await apiRequest('api/users/forgot-password/', {
        method: 'POST',
        data: { email },
      })

      setMessage(data.message);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center rounded-2xl bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleForgotPassword}
        className="bg-white dark:bg-gray-900 py-3 px-5 rounded-2xl shadow-xl w-96 space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Forgot Password
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

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
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