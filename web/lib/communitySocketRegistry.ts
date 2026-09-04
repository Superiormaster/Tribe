const desiredCommunities = new Set<number>();

export function addDesiredCommunity(
  communityId: number
) {
  desiredCommunities.add(
    Number(communityId)
  );
}

export function removeDesiredCommunity(
  communityId: number
) {
  desiredCommunities.delete(
    Number(communityId)
  );
}

export function getDesiredCommunities() {
  return Array.from(
    desiredCommunities
  );
}