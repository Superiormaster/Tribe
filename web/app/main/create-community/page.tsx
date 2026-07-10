'use client';

import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import CreateCommunity from "@/components/CreateCommunity";

export default function Page() {
  const { user } = useContext(UserContext)!;

  return <CreateCommunity user={user} />;
}