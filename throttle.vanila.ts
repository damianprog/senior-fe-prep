// bun test src/problems/05-throttle/test/throttle.test.ts

export function throttle<F extends (...args: any[]) => void>(
  fn: F,
  delay: number,
): (...args: Parameters<F>) => void {
  let lastTime = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let freshArgs: Parameters<F>;

  return function throttled(this: unknown, ...args: Parameters<F>) {
    freshArgs = args;

    if (Date.now() - lastTime > delay) {
      fn.apply(this, args);
      lastTime = Date.now();
    } else if (timerId === null) {
      timerId = setTimeout(() => {
        fn.apply(this, freshArgs);
        lastTime = Date.now();
        timerId = null;
      }, delay);
    }
  };
}
// --- Examples ---
// Uncomment to test your implementation:

const log = throttle((msg: string) => console.log(msg), 300);
log("a"); // fires immediately → "a"
log("b"); // ignored (within 300ms)
log("c"); // ignored (within 300ms)
// setTimeout(() => log("d"), 400); // fires → "d" (300ms passed)
