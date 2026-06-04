"use client";

import CommunityChat from "@/components/CommunityChat";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const communityId = Number(id);

  if (Number.isNaN(communityId)) {
    return <div>Invalid community ID</div>;
  }

  return (
    <CommunityChat communityId={communityId} />
  );
}