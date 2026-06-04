export function startActivityTracking(onInactive?: () => void) {
  let timer: any;

  const update = () => {
    const now = Date.now();

    localStorage.setItem("last_active", now.toString());
    localStorage.setItem("last_seen", now.toString());

    clearTimeout(timer);

    // UI inactivity only (5 min)
    timer = setTimeout(() => {
      onInactive?.();
    }, 5 * 60 * 1000);
  };

  const events = ["click", "scroll", "keydown", "touchstart"];

  events.forEach(e => window.addEventListener(e, update));

  update();

  return () => {
    events.forEach(e => window.removeEventListener(e, update));
    clearTimeout(timer);
  };
}

export function isSessionExpired() {
  const last = localStorage.getItem("last_seen");
  if (!last) return true;

  const diff = Date.now() - Number(last);

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  return diff > THIRTY_DAYS;
}