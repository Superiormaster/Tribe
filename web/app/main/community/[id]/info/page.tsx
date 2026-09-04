'use client';

import { useParams } from 'next/navigation';
import CommunityInfo from '@/components/community/CommunityInfo';

export default function CommunityInfoPage() {
  const params = useParams<{ id: string }>();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!id) return <p>Loading...</p>;

  return (
    <CommunityInfo communityId={id} />
  );
}