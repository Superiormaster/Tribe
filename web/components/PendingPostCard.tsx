// PendingPostCard.jsx
import PostCard from "./PostCard";

export default function PendingPostCard({ post, user, onApprove }) {
  return (
    <PostCard
      post={post}
      user={user}
      onApprove={onApprove} // calls handleApprove from CommunityPage.jsx
    />
  );
}