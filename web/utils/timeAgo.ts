// utils/timeAgo.ts
export function timeAgo(dateString: string) {
  const now = new Date()
  const past = new Date(dateString)
  const diff = (now.getTime() - past.getTime()) / 1000 // in seconds

  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`
  return `${Math.floor(diff / 2592000)}mo`
}