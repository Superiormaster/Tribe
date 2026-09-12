'use client'

type AvatarProps = {
  username?: string
  email?: string
  avatarUrl?: string
  size?: number
}

export default function Avatar({ username, email, avatarUrl, size = 40 }: AvatarProps) {
  const abbreviation = username
    ? username.slice(0, 2).toUpperCase()
    : email
    ? email.slice(0, 2).toUpperCase()
    : '??'

  return avatarUrl ? (
    <img
      src={avatarUrl}
      className={`w-${size} h-${size} rounded-full border-2 border-gray-400 dark:border-white object-cover`}
      alt={username || email || 'avatar'}
    />
  ) : (
    <div
      className={`w-${size} h-${size} rounded-full bg-gray-400 flex items-center justify-center text-white text-sm`}
    >
      {abbreviation}
    </div>
  )
}