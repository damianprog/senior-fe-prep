// bun test src/problems/13-stringify/test/stringify.test.ts

import { detectType } from "@course/utils";

/**
 * Converts a value to its string representation.
 *
 * Expected output by type:
 * - null:      null             → "null"
 * - number:    42               → "42"
 * - bigint:    42n              → "42"
 * - boolean:   true             → "true"
 * - symbol:    Symbol('x')      → '"Symbol(x)"'
 * - undefined: undefined        → '"undefined"'
 * - string:    "hello"          → '"hello"'
 * - object:    {a: 1, b: "x"}  → '{ a: 1, b: "x" }'
 * - map:       Map{a => 1}     → '{ a: 1 }'
 * - array:     [1, "a", true]   → '[1,"a",true]'
 * - set:       Set{1, 2}       → '[1,2]'
 * - date:      new Date()       → '3/7/2026, 5:47:00 PM'  (toLocaleString)
 * - regexp:    /abc/gi          → '/abc/gi'
 * - circular:  (ref to self)    → '[Circular]'
 * - other:     unknown type     → '"Unsupported Type"'
 */

type TCollection = Map<any, any> | Set<any> | Record<any, any> | Array<any>;

function entries(target: TCollection): Iterable<[key: any, value: any]> {
  if (target instanceof Map || target instanceof Set || Array.isArray(target)) {
    return target.entries();
  }
  return Object.entries(target);
}

export const stringify = (a: any, cache = new Set()): string => {
  const type = detectType(a);

  if (cache.has(a)) return "[Circular]";

  cache.add(a);

  switch (type) {
    case "symbol":
      return a.toString();
    case "null":
    case "number":
    case "bigint":
    case "boolean":
    case "regexp":
      return `${a}`;
    case "undefined":
    case "string": {
      return `"${a}"`;
    }
    case "date":
      return a.toLocaleString();
    case "map":
    case "object": {
      let keyValueStrings = [];
      for (const [key, value] of entries(a)) {
        keyValueStrings.push(`${key}: ${stringify(value, cache)}`);
      }
      return `{ ${keyValueStrings.join(", ")} }`;
    }
    case "array":
    case "set": {
      let values = [];
      for (const [key, value] of entries(a)) {
        values.push(stringify(value, cache));
      }
      return `[${values}]`;
    }
    default:
      return '"Unsupported Type"';
  }
};

// --- Examples ---
// Uncomment to test your implementation:

const circular: any = { a: 1 };
circular.self = circular;

const map = new Map();

map.set("ref", circular);

const a = {
  tescik: 1,
};

const b = {
  q: a,
  w: a,
};

// console.log(stringify(b));

// console.log(stringify(new Set([1, 2])));

// console.log(stringify(map));
// console.log(stringify(null)); // Expected: null
// console.log(stringify(42)); // Expected: 42
// console.log(stringify(true)); // Expected: true
// console.log(stringify("hello")); // Expected: "hello"
// console.log(stringify([1, "a", true])); // Expected: [1,"a",true]
// console.log(stringify({ a: 1, b: "x" })); // Expected: { a: 1, b: "x" }
// console.log(stringify(new Date())); // Expected: 3/7/2026, 8:15:00 PM (toLocaleString)
console.log(stringify(/abc/gi)); // Expected: /abc/gi
// console.log(stringify(circular)); // Expected: { a: 1, self: [Circular] }
