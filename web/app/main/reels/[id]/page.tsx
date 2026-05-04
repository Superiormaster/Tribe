'use client';

import { useParams } from 'next/navigation';
import ReelPage from '@/components/ReelPage';

export default function ReelCard() {
  const params = useParams();
  const id = params?.id;

  return (
    <ReelPage postId={id} />
  );
}