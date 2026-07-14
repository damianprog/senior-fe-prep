// bun test src/problems/09-deep-equals/test/deep-equals.test.ts

// import { detectType } from "@course/utils";

export function deepEquals(a: any, b: any, cache = new Map()): boolean {
  if (cache.has(a) && cache.get(a) === b) return true;
  cache.set(a, b);

  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => deepEquals(val, b[index], cache));
  }

  if (typeof a === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every((key) => {
      if (!b.hasOwnProperty(key)) return false;
      return deepEquals(a[key], b[key], cache);
    });
  }

  return false;
}

// --- Examples ---
// Uncomment to test your implementation:

console.log(deepEquals(1, 1)); // Expected: true
console.log(deepEquals("hello", "hello")); // Expected: true
console.log(deepEquals(null, undefined)); // Expected: false
console.log(deepEquals([1, 2, 3], [1, 2, 3])); // Expected: true
console.log(deepEquals({ a: 1, b: 2 }, { b: 2, a: 1 })); // Expected: true
console.log(deepEquals({ a: 1 }, { a: 2 })); // Expected: false

const a: any = { value: 1 };
a.self = a;
const b: any = { value: 1 };
b.self = b;
console.log(deepEquals(a, b)); // Expected: true (circular)
