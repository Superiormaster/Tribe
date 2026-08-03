"use client";

import SupportDetail from "../SupportDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SupportDetail id={id} />;
}