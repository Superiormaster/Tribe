'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/utils/api'
import Skeleton from '@/components/Skeleton'
import { useContext } from "react";
import { UserContext } from "@/components/UserContext"
import { uploadToCloudinary } from "@/utils/cloudinary"

const interestsList = [
  'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'World News', 'Local News'
]

export default function EditProfile() {
  const router = useRouter()
  const { user } = useContext(UserContext) || {};

  // Profile states
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [website, setWebsite] = useState('')
  const [creatorType, setCreatorType] = useState('')
  const [gender, setGender] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [interests, setInterests] = useState<string[]>([])

  const [avatar, setAvatar] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch profile
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
        if (profile.interests) setInterests(profile.interests)
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

  // Avatar preview
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

  // Toggle interests
  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  // Save profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username) return setError('Username is required')
    if (!email) return setError('Email is required')

    setSaving(true)
    try {
      const formData: any = {
        username,
        email,
        full_name: fullName,
        bio,
        country,
        city,
        website,
        creator_type: creatorType,
        gender,
        date_of_birth: year && month && day ? `${year}-${month}-${day}` : undefined,
        interests,
      }
  
      // Upload avatar and cover if changed
      if (avatar) {
        const avatarUrl = await uploadToCloudinary({ file: avatar, folder: "Tribe/Avatars" })
        formData.avatar = avatarUrl
      }
      if (cover) {
        const coverUrl = await uploadToCloudinary({ file: cover, folder: "Tribe/Covers" })
        formData.cover_photo = coverUrl
      }
  
      await apiRequest('api/users/me/', { method: 'PATCH', data: formData })
      router.push(`/main/profile/${user.username}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="text-center mt-10">
        <Skeleton onComplete={() => setLoading(false)} />
      </div>
    )

  return (
    <div className="flex justify-center items-center text-gray-800 dark:text-gray-200 rounded-2xl bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-6"
      >
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          Edit Your Profile
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Cover Photo */}
        <div>
          <label className="text-gray-700 dark:text-gray-300 font-medium">Cover Photo</label>
          <div
            className="h-40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-indigo-500 transition"
            onClick={() => document.getElementById('coverInput')?.click()}
          >
            {coverPreview ? (
              <img src={coverPreview} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm">Click to upload</span>
            )}
            <input
              type="file"
              id="coverInput"
              hidden
              accept="image/*"
              onChange={handleCoverChange}
            />
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <label className="text-gray-700 dark:text-gray-300 font-medium mb-2">Profile Picture</label>
          <div
            className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-indigo-500 transition"
            onClick={() => document.getElementById('avatarInput')?.click()}
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm text-center">Click to upload</span>
            )}
            <input
              type="file"
              id="avatarInput"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Username, Full Name, Email */}
        <div className="flex flex-col space-y-2">
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />
          <input
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col">
          <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
          <div className="grid grid-cols-3 gap-2">
            <select value={day} onChange={e => setDay(e.target.value)} className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800">
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            <select value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800">
              <option value="">Month</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800">
              <option value="">Year</option>
              {Array.from({ length: 100 }, (_, i) => {
                const y = new Date().getFullYear() - i
                return <option key={y} value={y}>{y}</option>
              })}
            </select>
          </div>
        </div>

        {/* Gender */}
        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800">
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        {/* Bio */}
        <textarea placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800 resize-none" rows={4} />

        {/* Country / City / Website */}
        <div className="grid grid-cols-2 gap-4">
          <input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800" />
          <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800" />
        </div>
        <input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800" />

        {/* Creator Type */}
        <select value={creatorType} onChange={e => setCreatorType(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800">
          <option value="">Creator Type</option>
          <option>Journalist</option>
          <option>Analyst</option>
          <option>Blogger</option>
          <option>News Organization</option>
          <option>Community Reporter</option>
        </select>

        {/* Interests */}
        <div>
          <p className="font-medium mb-2">Interests</p>
          <div className="flex flex-wrap gap-2">
            {interestsList.map(item => (
              <button type="button" key={item} onClick={() => toggleInterest(item)} className={`px-3 py-1 rounded-full text-sm ${interests.includes(item) ? 'bg-indigo-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}