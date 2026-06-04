export const getMessageKey = (m) =>
  m.id
    ? `id-${m.id}`
    : String(
        m.localId ||
        m.clientId
      );

export function sortMessages(msgs: any[]) {
  return [...msgs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );
}

export function mergeMessages(prev: any[], incoming: any[]) {
  const map = new Map<string, any>();

  [...prev, ...incoming].forEach((m) => {

    const key = getMessageKey(m);
  
    console.log(
      "MERGE KEY",
      key,
      {
        id: m.id,
        localId: m.localId,
        clientId: m.clientId,
      }
    );
  
    map.set(key, m);
  });

  return sortMessages(Array.from(map.values()));
}

export function normalizeMessages(res: any) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  return [];
}