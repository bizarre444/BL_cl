// Tiny event bus. Game logic talks to UI through events, never DOM directly.

const listeners = new Map();

export const bus = {
  on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => bus.off(evt, fn);
  },
  off(evt, fn) { listeners.get(evt)?.delete(fn); },
  emit(evt, data) {
    const set = listeners.get(evt);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(data); } catch (e) { console.error(`[bus:${evt}]`, e); }
    }
  },
};
