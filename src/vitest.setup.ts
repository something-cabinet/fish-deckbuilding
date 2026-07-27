/**
 * Vitest setup — provides minimal browser globals required by Excalibur.
 *
 * Excalibur's polyfill attempts to set `window` if it's undefined,
 * but that throws in strict-mode ES modules. We define it here
 * before any module imports happen.
 */

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {};
}

// Polyfill requestAnimationFrame / cancelAnimationFrame for Excalibur
if (typeof (globalThis as any).requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = ((callback: FrameRequestCallback): number => {
    return +setTimeout(callback, 0);
  }) as typeof globalThis.requestAnimationFrame;
}

if (typeof (globalThis as any).cancelAnimationFrame === 'undefined') {
  (globalThis as any).cancelAnimationFrame = ((handle: number): void => {
    clearTimeout(handle);
  }) as typeof globalThis.cancelAnimationFrame;
}
