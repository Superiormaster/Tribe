export const FORCE_HOME_EVENT = "force-home";

export function forceHome() {
  window.dispatchEvent(new Event(FORCE_HOME_EVENT));
}