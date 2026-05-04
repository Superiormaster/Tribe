export function startActivityTracking(onInactive?: () => void) {
  let timer: any;

  const update = () => {
    localStorage.setItem("last_active", Date.now().toString());
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      onInactive?.();
    }, 5 * 60 * 1000); // 5 minutes
  };

  const events = ["click", "scroll", "keydown"];

  events.forEach(e => window.addEventListener(e, update));
  
  update(); // start immediately

  return () => {
    events.forEach(e => window.removeEventListener(e, update));
    clearTimeout(timer);
  };
}

export function isSessionExpired() {
  const last = localStorage.getItem("last_active");
  if (!last) return false;

  const diff = Date.now() - Number(last);

  const FIVE_MINUTES = 5 * 60 * 1000;

  return diff > FIVE_MINUTES;
}