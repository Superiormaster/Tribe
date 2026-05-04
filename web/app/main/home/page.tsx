import ProtectedRoute from '@/components/ProtectedRoute';
import FeedContent from './FeedContent';

export default function HomePageWrapper() {
  return (
    <ProtectedRoute>
      <FeedContent />
    </ProtectedRoute>
  );
}