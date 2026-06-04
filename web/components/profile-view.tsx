'use client'

import { useEffect,useState } from 'react'
import { useParams } from 'next/navigation'
import { apiRequest } from '@/utils/api'
import Skeleton from '@/components/Skeleton'

export default function ProfilePage(){

  const params = useParams()
  const username = params.username as string

  const [profile,setProfile] = useState<any>(null)
  const [posts,setPosts] = useState<any[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    const load = async()=>{

      try{

        const profileData = await apiRequest(`api/users/${username}/`)
        const postsData = await apiRequest(`/api/posts/?author=${username}`)

        setProfile(profileData)
        setPosts(postsData)

      }catch(err){
        console.error(err)
      }

      setLoading(false)

    }

    load()

  },[username])

  if(loading) return <Skeleton/>

  return(

    <div className="max-w-3xl mx-auto">

      {/* Cover */}

      <div className="h-44 bg-gray-200 overflow-hidden">

        {profile.cover_photo && (
          <img
            src={profile.cover_photo}
            className="w-full h-full object-cover"
          />
        )}

      </div>

      {/* Avatar */}

      <div className="px-4">

        <img
          src={profile.avatar}
          className="w-24 h-24 rounded-full border-4 border-white -mt-12"
        />

        <h1 className="text-xl font-bold mt-2">
          {profile.display_name}
        </h1>

        <p className="text-gray-500">
          @{profile.username}
        </p>

        {profile.bio && (
          <p className="mt-2">{profile.bio}</p>
        )}

        <div className="flex gap-4 mt-3 text-sm text-gray-500">

          {profile.country && (
            <span>
              {profile.city}, {profile.country}
            </span>
          )}

          {profile.website && (
            <a
              href={profile.website}
              className="text-indigo-600"
            >
              Website
            </a>
          )}

        </div>

        {/* Creator Type */}

        {profile.creator_type && (
          <p className="text-sm mt-2 text-indigo-600">
            {profile.creator_type}
          </p>
        )}

      </div>

      {/* Posts */}

      <div className="p-4 space-y-4">

        {posts.map(post=>(
          <div key={post.id} className="p-4 border rounded-lg">
            {post.content}
          </div>
        ))}

      </div>

    </div>
  )
}