type User = {
  role?: string;
};

export function canAccess(
  user: User | null | undefined,
  roles: string[] = []
): boolean {
  if (!user?.role) return false;

  return roles.includes(user.role);
}