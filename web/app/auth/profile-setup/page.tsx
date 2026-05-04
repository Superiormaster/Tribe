'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { countries } from "countries-list"
import { uploadToCloudinary } from '@/utils/cloudinary';
import { apiRequest } from '@/utils/api'

interface OnboardingStatus {
  profileCompleted: boolean
  interestsCompleted: boolean
  starCompleted: boolean
  completed: boolean // all done
}

export default function ProfileSetup() {
  const router = useRouter()

  // Profile states
  const [fullName,setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [website,setWebsite] = useState('')
  const [creatorType,setCreatorType] = useState('')

  const [cover,setCover] = useState<File | null>(null)
  const [coverPreview,setCoverPreview] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [gender, setGender] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<any | null>(null)

  // Prefill username and email after login/registration
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiRequest('api/users/me/')

        setUsername(profile.username || '')
        setEmail(profile.email || '')
        setFullName(profile.full_name || '')
        setBio(profile.bio || '')
        setCountry(profile.country || '')
        setCity(profile.city || '')
        setWebsite(profile.website || '')
        setCreatorType(profile.creator_type || '')
        setGender(profile.gender || '')
        if (profile.date_of_birth) {
          const [y, m, d] = profile.date_of_birth.split('-')
          setYear(y)
          setMonth(m)
          setDay(d)
        }
        if (profile.avatar) setPreview(profile.avatar)
        if (profile.cover_photo) setCoverPreview(profile.cover_photo)
      } catch {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])
  
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const status: OnboardingStatus = await apiRequest('api/users/onboarding-status/')
        
        if (status.completed) {
          router.replace('/main/home')
          return
        }
        if (status.profileCompleted) {
          router.replace('/auth/interests')
          return
        }
      } catch (err) {
        console.error(err)
      }
    }
  
    checkOnboarding()
  }, [router])

  // Fetch countries list
  const countryList = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name
  }))
  
  // Avatar preview handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (preview) URL.revokeObjectURL(preview)
      setAvatar(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  // Cover preview
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCover(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
  
    if (!fullName) return setError('Full Name is required')
    if (!email) return setError('Email is required')
    if (!username) return setError('Username is required')

    try {
      let avatarUrl = preview
      let coverUrl = coverPreview

      if (avatar) avatarUrl = await uploadToCloudinary(avatar, "Tribe/Avatars")
      if (cover) coverUrl = await uploadToCloudinary(cover, "Tribe/Covers")
  
      const formData = new FormData()
      const dob = year && month && day ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
  
      formData.append('username', username)
      formData.append('email', email)
      formData.append('full_name', fullName)
      formData.append('bio', bio)
  
      formData.append('country', country)
      formData.append('city', city)
      if (website) {
        // Ensure it starts with http:// or https://
        let formattedWebsite = website
        if (!/^https?:\/\//i.test(website)) {
          formattedWebsite = 'https://' + website
        }
        formData.append('website', formattedWebsite)
      }
  
      formData.append('creator_type', creatorType)
      formData.append('gender', gender)
  
      if (dob) formData.append('date_of_birth', dob)
      if (avatarUrl) formData.append('avatar', avatarUrl)
      if (coverUrl) formData.append('cover_photo', coverUrl)
  
      await apiRequest('api/users/me/', {
        method: 'PATCH',
        data: formData
      })
  
      router.push('/auth/interests')
  
    } catch (err: any) {
  
      setError(err.message || 'Something went wrong')
  
    } finally {
  
      setLoading(false)
  
    }
  }
  
  return (
    <div className="flex justify-center items-center text-gray-700 dark:text-gray-200 rounded-2xl bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 py-3 px-5 rounded-2xl shadow-xl w-full max-w-md space-y-6"
      >
        <button
            onClick={() => router.back()}
            className="p-1 border-indigo-500 rounded-lg hover:bg-gray-200 border dark:hover:bg-gray-800"
          >
            ←
          </button>
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Complete Your Profile
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label className="text-gray-700 dark:text-gray-300 font-medium">Cover Photo</label>

          <div
            className="h-40 rounded-lg cursor-pointer border overflow-hidden border-gray-300 dark:border-gray-600 flex items-center justify-center border-2 border-dashed relative hover:border-indigo-500 transition"
            onClick={()=>document.getElementById('cover')?.click()}
          >
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm text-center px-2">
                Click to upload
              </span>
            )}
          </div>

          <input
            id="cover"
            type="file"
            hidden
            accept="image/*"
            onChange={(e)=>{
              const file = e.target.files?.[0]
              if(file){
                setCover(file)
                setCoverPreview(URL.createObjectURL(file))
              }
            }}
          />
        </div>
        
        {/* Avatar Upload */}
        <div className="flex flex-col items-center">
          <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Profile Picture
          </label>

          <div
            className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden relative hover:border-indigo-500 transition"
            onClick={() => document.getElementById('avatarInput')?.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="Avatar Preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm text-center px-2">
                Click to upload
              </span>
            )}
            <input
              type="file"
              id="avatarInput"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Username */}
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Full name
          </label>
          <input
            placeholder="Full name"
            value={fullName}
            onChange={(e)=>setFullName(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col">
          <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Date of Birth
          </label>
        
          <div className="grid grid-cols-3 gap-2">
        
            {/* Day */}
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
        
            {/* Month */}
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
            >
              <option value="">Month</option>
        
              {[
                "January","February","March","April","May","June",
                "July","August","September","October","November","December"
              ].map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
        
            </select>
        
            {/* Year */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
            >
              <option value="">Year</option>
        
              {Array.from({ length: 100 }, (_, i) => {
                const y = new Date().getFullYear() - i
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              })}
        
            </select>
        
          </div>
        </div>

        {/* Gender */}
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Gender
          </label>
        
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        </div>

        {/* Bio */}
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Bio
          </label>
          <textarea
            placeholder="Tell us something about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800 resize-none"
            rows={4}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">

          {/* Country */}
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
            required
          >
            <option value="">Select Country</option>
  
            {countryList.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <input
              placeholder="City"
              value={city}
              onChange={(e)=>setCity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
            />
          </div>
  
          <input
            placeholder="Website"
            value={website}
            onChange={(e)=>setWebsite(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />

        {/* Creator Type */}

        <select
          value={creatorType}
          onChange={(e)=>setCreatorType(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
        >
          <option value="">Creator Type</option>
          <option value="journalist">Journalist</option>
          <option value="analyst">Analyst</option>
          <option value="blogger">Blogger</option>
          <option value="news_org">News Organization</option>
          <option value="community">Community Reporter</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          {loading ? 'Saving...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  )
}