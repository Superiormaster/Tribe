import InviteMembers from "@/components/community/InviteMembers";

export default async function InvitePage({
  params
}: any) {

  return (
    <InviteMembers
      communityId={params.id}
    />
  );
}