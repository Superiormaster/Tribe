'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from '@/utils/api'

export default function RegisterPage() {

  const { push } = useNavigation()

  const [username,setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirm,setConfirm] = useState('')

  const [showPassword,setShowPassword] = useState(false)
  const [showConfirm,setShowConfirm] = useState(false)

  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')

  function validatePassword(password: string) {

    if (password.length < 8) {
      return "Password must be at least 8 characters"
    }
  
    if (!/[A-Z]/.test(password)) {
      return "Password must include an uppercase letter"
    }
  
    if (!/[a-z]/.test(password)) {
      return "Password must include a lowercase letter"
    }
  
    if (!/\d/.test(password)) {
      return "Password must include a number"
    }
  
    return null
  }
  
  const handleRegister = async (e:React.FormEvent) => {
    e.preventDefault()

    const passwordError = validatePassword(password)

    if(passwordError){
      setError(passwordError)
      return
    }
  
    if(password !== confirm){
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try{

      const data = await apiRequest('api/users/register/',{
        method:'POST',
        data: {
          username,
          email,
          password
        },
      })

      alert(data.message)

      push('/auth/login')

    }catch(err:any){

      setError(err?.message || 'Registration failed')

    }finally{
      setLoading(false)
    }
  }

  return(

    <div className="flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-950">

      <form
      onSubmit={handleRegister}
      className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg space-y-5"
      >

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
          Create your Tribe account
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Username */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Username
          </label>
          <input
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 focus:outline-none focus:border-indigo-500"
          placeholder="Enter username"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Email
          </label>
          <input
          type="email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 focus:outline-none focus:border-indigo-500"
          placeholder="Enter email"
          />
        </div>

        {/* Password */}
        <div className="space-y-1 relative">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Password
          </label>

          <input
          type={showPassword ? 'text':'password'}
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 focus:outline-none focus:border-indigo-500"
          placeholder="Enter password"
          />

          <button
          type="button"
          onClick={()=>setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-gray-500"
          >
            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>

        </div>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Confirm Password */}
        <div className="space-y-1 relative">

          <label className="text-sm text-gray-600 dark:text-gray-400">
            Confirm Password
          </label>

          <input
          type={showConfirm ? 'text':'password'}
          value={confirm}
          onChange={(e)=>setConfirm(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 focus:outline-none focus:border-indigo-500"
          placeholder="Confirm password"
          />

          <button
          type="button"
          onClick={()=>setShowConfirm(!showConfirm)}
          className="absolute right-3 top-9 text-gray-500"
          >
            {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>

        </div>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-sm text-center text-gray-500">
          Already have an account?
          <a href="/auth/login" className="text-indigo-600 ml-1">
            Login
          </a>
        </p>

      </form>

    </div>
  )
}