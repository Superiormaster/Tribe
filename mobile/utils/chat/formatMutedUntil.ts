  export const formatMutedUntil = (
    date?: string | null
  ) => {
    if (!date) return "";
  
    const mutedDate =
      new Date(date);
  
    const now = new Date();
  
    const tomorrow = new Date();
    tomorrow.setDate(
      now.getDate() + 1
    );
  
    if (
      mutedDate.toDateString() ===
      tomorrow.toDateString()
    ) {
      return `Muted until tomorrow, ${mutedDate.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    if (
      mutedDate.toDateString() ===
      now.toDateString()
    ) {
      return `Muted until today, ${mutedDate.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    return `Muted until ${mutedDate.toLocaleDateString(
      [],
      {
        month: "short",
        day: "numeric",
        year:
          mutedDate.getFullYear() !==
          now.getFullYear()
            ? "numeric"
            : undefined,
      }
    )}, ${mutedDate.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )}`;
  };