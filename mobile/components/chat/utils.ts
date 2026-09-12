export default function formatMessageDate(dateStr?: string) {

  if (!dateStr) return 'Today';

  const date = new Date(dateStr);
  const now = new Date();

  // RESET TIMES
  const msgDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const diffDays =
    Math.round(
      (today.getTime() - msgDate.getTime()) /
      (1000 * 60 * 60 * 24)
    );

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year:
        date.getFullYear() !== now.getFullYear()
          ? 'numeric'
          : undefined,
    }
  );
}