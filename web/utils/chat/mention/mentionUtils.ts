export function getMentionQuery(
  value: string,
  cursor: number
) {
  const beforeCursor = value.slice(0, cursor);

  const match = beforeCursor.match(
    /(^|\s)@([a-zA-Z0-9_]{0,30})$/
  );

  if (!match) {
    return null;
  }

  return {
    query: match[2] || "",
    start:
      cursor - (match[2]?.length || 0) - 1,
    end: cursor,
  };
}

export function isMentionAll(query: string) {
  return query.toLowerCase() === "all";
}

export function insertMention(
  value: string,
  start: number,
  end: number,
  username: string
) {
  return (
    value.slice(0, start) +
    `@${username} ` +
    value.slice(end)
  );
}