export function canAccess(user, roles = []) {
  if (!user || !user.role) return false
  return roles.includes(user.role)
}