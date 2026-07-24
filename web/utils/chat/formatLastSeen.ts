  export const formatLastSeen = (date?: string | null) => {
    if (!date) return "";
  
    const lastSeen = new Date(date);
    const now = new Date();
  
    const diff =
      now.getTime() - lastSeen.getTime();
  
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
  
    // under a minute
    if (seconds < 60) {
      return "Just now";
    }
  
    // under an hour
    if (minutes < 60) {
      return `${minutes} min${
        minutes > 1 ? "s" : ""
      } ago`;
    }
  
    // today
    if (
      lastSeen.toDateString() ===
      now.toDateString()
    ) {
      return `${lastSeen.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    // yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
  
    if (
      lastSeen.toDateString() ===
      yesterday.toDateString()
    ) {
      return `Yesterday, ${lastSeen.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    // older dates
    return `${lastSeen.toLocaleDateString(
      [],
      {
        day: "numeric",
        month: "short",
        year:
          lastSeen.getFullYear() !==
          now.getFullYear()
            ? "numeric"
            : undefined,
      }
    )}`;
  };