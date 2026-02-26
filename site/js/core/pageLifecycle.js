// Creates a page lifecycle manager for teardown callbacks.
export function createPageLifecycle() {
  const destroyers = [];

  return {
    add(fn) {
      if (typeof fn === "function") {
        destroyers.push(fn);
      }
    },

    destroy() {
      while (destroyers.length) {
        const fn = destroyers.pop();
        try {
          fn();
        } catch (_err) {
          // ignore teardown failures
        }
      }
    },
  };
}
