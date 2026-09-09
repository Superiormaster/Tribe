import {
  getDB,
  MESSAGE_SEQUENCE_STORE,
} from "@/lib/db";

type MessageSequence = {
  ownerId: number;
  nextSequence: number;
};

export async function getNextClientSequence(
  ownerId: number
): Promise<number> {
  const db = await getDB();

  if (!db) {
    throw new Error(
      "IndexedDB unavailable"
    );
  }

  const normalizedOwnerId =
    Number(ownerId);

  if (
    !Number.isFinite(normalizedOwnerId) ||
    normalizedOwnerId <= 0
  ) {
    throw new Error(
      `Invalid ownerId: ${ownerId}`
    );
  }

  const existing =
    await db.get(
      MESSAGE_SEQUENCE_STORE,
      normalizedOwnerId
    ) as MessageSequence | undefined;

  const nextSequence =
    (existing?.nextSequence ?? 0) + 1;

  await db.put(
    MESSAGE_SEQUENCE_STORE,
    {
      ownerId: normalizedOwnerId,
      nextSequence,
    }
  );

  return nextSequence;
}