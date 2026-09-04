import {
  getDB,
  MESSAGE_SEQUENCE_STORE,
} from "@/lib/db";

type MessageSequence = {
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

  const existing =
    await db.get(
      MESSAGE_SEQUENCE_STORE,
      String(ownerId)
    ) as MessageSequence | undefined;

  const nextSequence =
    (existing?.nextSequence ?? 0) + 1;

  await db.put(
    MESSAGE_SEQUENCE_STORE,
    {
      nextSequence,
    },
    String(ownerId)
  );

  return nextSequence;
}