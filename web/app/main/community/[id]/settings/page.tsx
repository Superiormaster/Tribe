"use client";

import CommunitySettingPage from "@/components/CommunitySettingPage";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ id: string }>();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!id) return <p>Loading...</p>;

  return <CommunitySettingPage communityId={id} />;
}