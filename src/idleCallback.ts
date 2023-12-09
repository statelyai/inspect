export function idleCallback(cb: () => void) {
  if (typeof window !== 'undefined') {
    const raf = window.requestIdleCallback || window.requestAnimationFrame;
    raf(cb);
  } else {
    setTimeout(cb, 0);
  }
}
