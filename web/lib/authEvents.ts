export const FORCE_HOME_EVENT = "force-home";
export const REFRESH_HOME_EVENT = "refresh-home";

export function forceHome() {
  window.dispatchEvent(new Event(FORCE_HOME_EVENT));
}

export function refreshHome() {
  window.dispatchEvent(new Event(REFRESH_HOME_EVENT));
}