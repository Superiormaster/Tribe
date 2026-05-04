"use client";

import CommunityChat from "@/components/CommunityChat";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams();

  return (
    <CommunityChat communityId={params.id} />
  );
}