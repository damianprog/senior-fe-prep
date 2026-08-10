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
function entries(target: TCollection): Iterable<[key: any, value: any]> {
  if (target instanceof Map || target instanceof Set || Array.isArray(target)) {
    return target.entries();
  }
  return Object.entries(target);
}
function set(target: TCollection, key: any, value: any) {
  if (target instanceof Map) {
    target.set(key, value);
  } else if (target instanceof Set) {
    target.add(value);
  } else if (Array.isArray(target)) {
    target[key] = value;
  } else {
    target[key] = value;
  }
}

export const deepClone = <T>(a: T, cache = new Map()): T => {
  const type = detectType(a);

  if (!a || typeof a !== "object") {
    return a;
  }

  const cachedClone = cache.get(a);

  if (cachedClone) return cachedClone;

  switch (type) {
    case "date":
      return new Date(Number(a)) as T;
    case "object":
    case "array":
    case "map":
    case "set": {
      const clone = getTarget(type);
      cache.set(a, clone);
      for (const [key, value] of entries(a)) {
        set(clone, key, deepClone(value, cache));
      }

      return clone as T;
    }
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
