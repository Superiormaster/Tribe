// app/main/profile/[username]/page.tsx
import UserProfilePage from '@/components/UserProfilePage';

export default function ProfilePage({ params }: { params: { username: string } }) {
  return <UserProfilePage />;
}