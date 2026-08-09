// bun test src/problems/10-deep-clone/test/deep-clone.test.ts
// TODO: Implement deepClone

import { detectType } from "@course/utils";

type TCollection = Map<any, any> | Set<any> | Record<any, any> | Array<any>;

function getTarget(type: string): TCollection {
  switch (type) {
    case "map":
      return new Map();
    case "set":
      return new Set();
    case "array":
      return [];
    default:
      return {};
  }
}
function entries(target: TCollection): Iterable<[key: any, value: any]> {}
function set(target: TCollection, key: any, value: any) {}

export const deepClone = <T>(a: T, cache = new Map()): T => {
  const type = detectType(a);

  if (!a || typeof a !== "object") {
    return a;
  }

  const cachedClone = cache.get(a);

  if (cachedClone) return cachedClone;

  switch (type) {
    case "date":
    case "object":
    case "array": {
      const clone = getTarget(type);

      for (const [key, value] of Object.entries(a)) {
        clone[key] = deepClone(value, cache);
      }

      return clone as T;
    }
    case "map":
    case "set":
    default:
      throw "Unsupported type " + a;
  }
};

// --- Examples ---
// Uncomment to test your implementation:

const obj = { a: { b: 1 }, c: [2, 3] };
const cloned = deepClone(obj);
cloned.a.b = 99;
console.log(obj.a.b); // Expected: 1 (unaffected)
console.log(cloned.a.b); // Expected: 99

const map = new Map([["key", { value: 1 }]]);
const clonedMap = deepClone(map);
console.log(clonedMap.get("key")); // Expected: { value: 1 }
console.log(clonedMap.get("key") !== map.get("key")); // Expected: true

const circular: any = { a: 1 };
circular.self = circular;
const clonedCircular = deepClone(circular);
console.log(clonedCircular.self === clonedCircular); // Expected: true
