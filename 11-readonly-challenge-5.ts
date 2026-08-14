/**
 * 2.2 Readonly
 *
 * Implement the built-in `Readonly<T>` generic without using it.
 * Constructs a type with all properties of `T` set to readonly, meaning the properties cannot be reassigned.
 *
 * @example
 * interface Todo {
 *   title: string
 * }
 *
 * const todo: MyReadonly<Todo> = { title: "Hey" }
 * todo.title = "Hello" // Error: cannot reassign a readonly property
 */

import type { Equal, Expect } from "@course/types";

/* _____________ Your Code Here _____________ */

// Your implementation here

type MyReadonly<T> = {
  readonly [Property in keyof T]: T[Property];
};

// Rozwiązanie instruktora
// type MyReadonly<T extends {}> = {
//   readonly [Property in keyof T]: T[Property];
// };

type Z = MyReadonly<string>;

type Suspect<T> = { readonly [P in keyof T as P]: T[P] };
type X = Suspect<string[]>; // wciąż readonly string[]?

type X2 = Suspect<string[]>;
declare const b: X2;

const lit: X2 = ["a", "b"]; // 1. czy literał tablicy pasuje?
b[0] = "z"; // 2. czy indeks jest readonly?
b.push("q"); // 3. czy push w ogóle istnieje?
b.map((s) => s); // 4. czy map istnieje?

declare const ro: readonly string[];
const c1: X2 = ro; // 5. czy readonly string[] pasuje do X2?

type A = MyReadonly<{ a?: string }>; // czy `?` przeżyje?
type B = MyReadonly<string[]>; // czy dostaniesz obiekt z kluczami "0" | "1" | "push"...?
type C = MyReadonly<{ a: 1 } | { b: 2 }>; // jeden typ czy union?

/* _____________ Test Cases _____________ */

interface Todo {
  title: string;
  description: string;
}

type cases = [Expect<Equal<MyReadonly<Todo>, Readonly<Todo>>>];
