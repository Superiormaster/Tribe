export const formatLastSeen = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);
  const now = new Date();

  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isYesterday =
    days === 1;

  const sameYear =
    date.getFullYear() === now.getFullYear();

  if (seconds < 60) return 'last seen just now';

  if (minutes < 60)
    return `last seen ${minutes}m ago`;

  if (hours < 24)
    return `last seen ${hours}h ago`;

  if (isYesterday)
    return `last seen yesterday at ${time}`;

  if (sameYear)
    return `last seen ${date.getDate()}/${date.getMonth() + 1} at ${time}`;

  return `last seen ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};