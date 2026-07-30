import EventEmitter from "eventemitter3";

export const FORCE_HOME_EVENT = "force-home";
export const REFRESH_HOME_EVENT = "refresh-home";

const emitter = new EventEmitter();

export function forceHome() {
  emitter.emit(FORCE_HOME_EVENT);
}

export function refreshHome() {
  emitter.emit(REFRESH_HOME_EVENT);
}

export function addForceHomeListener(
  callback: () => void
) {
  emitter.on(FORCE_HOME_EVENT, callback);

  return () => {
    emitter.off(
      FORCE_HOME_EVENT,
      callback
    );
  };
}

export function addRefreshHomeListener(
  callback: () => void
) {
  emitter.on(
    REFRESH_HOME_EVENT,
    callback
  );

  return () => {
    emitter.off(
      REFRESH_HOME_EVENT,
      callback
    );
  };
}