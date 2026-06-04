'use client'

import { useState, useEffect, useContext } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { apiRequest } from '@/utils/api'
import { UserContext } from '@/components/UserContext'
import { useSearchParams } from "next/navigation"
import { storeRefreshToken, getRefreshToken } from "@/lib/keyStore"
import { setAccessToken } from "@/utils/api"
import { useNavigation } from "@/utils/useNavigation";

export default function LoginPage() {

  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email");
  const [email, setEmail] = useState(initialEmail || '');
  const { push } = useNavigation();

  const { user, setUser, loadingUser } = useContext(UserContext)!

  const [password,setPassword] = useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  // Handle email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await apiRequest('api/users/login/', {
        method: 'POST',
        data: { email, password },
      })
      const { access, refresh, user } = res;

      await storeRefreshToken(user.email, refresh);
      setAccessToken(access);

      // Fetch user profile
      const profile = await apiRequest('api/users/me/', {
        method: 'GET',
      })
    } catch(err:any) {
      const detail = err?.detail || err?.message || 'Login failed'
      if (detail.includes("Email not verified")) {
      } else if (detail.includes("credentials")) {
        setError("Wrong email or password.")
      } else {
        setError(detail)
      }
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="flex justify-center items-center rounded-2xl text-gray-700 dark:text-gray-200 dark:bg-gray-200 bg-gray-50 dark:bg-gray-950">
      <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg w-96 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Login to Tribe</h1>

        {error && <div className="bg-red-100 text-red-600 px-3 py-2 rounded">{error}</div>}

        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
          required className="w-full p-2 rounded border bg-gray-100 dark:bg-gray-800"/>

        <div className="relative">
          <input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"
            required className="w-full p-2 rounded border bg-gray-100 dark:bg-gray-800"/>
          <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-2">
            {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
          </button>
        </div>

        <button
          disabled={loading}
          className={`w-full py-2 rounded text-white
          ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
        `}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

      </form>
    </div>
  )
}