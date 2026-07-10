/**
 * 1.3 Tuple to Union
 *
 * Implement a generic `TupleToUnion<T>` which covers the values of a tuple to its values union.
 *
 * @example
 * type Arr = ['1', '2', '3']
 *
 * type Test = TupleToUnion<Arr> // '1' | '2' | '3'
 */

import type { Equal, Expect } from "@course/types";

/* _____________ Your Code Here _____________ */

type TupleToUnion<T extends any[]> = T[number];
/* _____________ Test Cases _____________ */

type cases = [
  Expect<Equal<TupleToUnion<[123, "456", true]>, 123 | "456" | true>>,
  Expect<Equal<TupleToUnion<[123]>, 123>>,
];
