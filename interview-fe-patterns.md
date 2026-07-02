# Interview FE Patterns — JS/TS Mechanics

> Baza wiedzy dla pytań o **mechanikę JS/TS** (nie algorytmy — te są w `interview-patterns.md`).
> Zakres: `this` binding, closures, higher-order functions, timery, typowanie generyczne, wzorce FE (debounce/throttle, memoize, event emitter, itd.).

---

## Spis treści

1. [Debounce](#1-debounce)

---

## 1. Debounce

**Kategoria:** Higher-order functions · `this` binding · closures · timery
**Poziom:** oznaczone „Easy", realnie **mid/senior** — sedno leży w `this` i typowaniu, nie w logice.

### Key insight

`debounce` opóźnia wywołanie `fn` aż do momentu, gdy przez `delay` ms nie było _żadnego_ nowego wywołania. Każde wywołanie **resetuje** timer (`clearTimeout` + nowy `setTimeout`). Prawdziwa trudność to nie logika timera — to **poprawne przeniesienie `this` przez granicę asynchroniczną** i **przenośne otypowanie handle'a timera**.

### Canonical implementation

```typescript
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let currentTimerId: ReturnType<typeof setTimeout>;

  return function (this: unknown, ...args: any[]) {
    if (currentTimerId) {
      clearTimeout(currentTimerId);
    }
    currentTimerId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

### Dwie role `this` (rdzeń zadania)

To jest odpowiedź, którą chce usłyszeć interviewer — nie „użyłem `apply`", tylko rozbicie na dwie osobne role:

| Funkcja                             | Typ        | Rola                                                                                                                                                            |
| ----------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **outer** (zwracana)                | `function` | Musi **przyjąć** `this` od wołającego: `debounced.apply(ctx)`. Arrow by tu nie zadziałał — nie ma własnego `this`, więc `.apply(ctx)` nie miałby czego ustawić. |
| **inner** (callback w `setTimeout`) | **arrow**  | Musi **przetrwać** z tym `this` do momentu odpalenia timera. Arrow łapie `this` **leksykalnie** w chwili definicji, więc zamraża kontekst z outer.              |
| **`fn.apply(this, args)`**          | —          | Forwarduje zamrożony `this` dalej do oryginalnej `fn`. Bez tego `fn` dostałoby `undefined` (goły call).                                                         |

**Sekwencja psucia się `this`, gdyby callback był zwykłą `function`:**
`setTimeout` po `delay` ms woła callback jako **gołe wywołanie**, poza stackiem `debounced`, bez wstrzyknięcia `this` → `this` === `undefined` (strict) / `globalThis` → kontekst przepada. Arrow to omija, bo w ogóle nie słucha, _jak_ `setTimeout` ją woła — ma `this` już zamrożony.

### Typowanie handle'a timera

```typescript
let currentTimerId: ReturnType<typeof setTimeout>;
```

- `typeof setTimeout` → typ samej funkcji (`typeof` w pozycji typu).
- `ReturnType<...>` → utility type wyciągający typ zwracany z sygnatury.
- **Efekt:** adnotacja dostosowuje się do środowiska sama — `number` pod DOM, `NodeJS.Timeout` pod `@types/node`, `Timer` pod Bun. Kod się nie zmienia.

**Dlaczego nie zwykłe `let id = setTimeout(...)` z inferencją?** Bo zmienna musi istnieć _przed_ returnem, gdy żaden timer jeszcze nie wystartował — nie masz czym jej zainicjalizować w punkcie deklaracji. `ReturnType<typeof setTimeout>` daje adnotację na „pustej" `let` bez commitowania się do nazwy typu.

### Typowanie `this` — `this: unknown`

Zamiana outer z arrow na `function` odpala błąd `noImplicitThis` (część `strict`):

> `'this' implicitly has type 'any' because it does not have a type annotation. ts(2683)`

Logika TS: zwykła `function` może dostać _dowolny_ `this` zależnie od wywołania (`debounced()` vs `debounced.apply(ctx)` vs `obj.debounced()`). TS nie wstawi po cichu `any` — żąda jawnej deklaracji. (Pod arrow błędu nie było, bo arrow nie ma własnego `this`.)

Deklaruje się go jako **fałszywy pierwszy parametr `this`** — istnieje tylko w typach, znika po kompilacji, nie przesuwa pozostałych argumentów:

```typescript
return function (this: unknown, ...args: any[]) {
```

**Czemu `unknown`, a nie konkretny typ ani `any`?** Bo `debounce` jest generyczny i przepuszcza `this` przez `fn.apply(this, args)` — nie czyta z niego żadnych pól. `apply` też nie zakłada nic o `thisArg`, więc `unknown` się tam wciska bez marudzenia.

- **`any`** — wyłącza sprawdzanie; przypadkowe `this.value` przeszłoby cicho i wybuchło w runtime.
- **`unknown`** — pełna swoboda w _przekazywaniu_ (`apply` nic z nim nie robi), zero swobody w _ślepym ufaniu_ (dotknięcie `this.cokolwiek` → TS zatrzymuje: „najpierw sprawdź"). Domyślna preferencja `unknown > any` wszędzie, gdzie wartość tylko przenosisz, nie konsumujesz.

### Named pitfalls (w tym własne anty-wzorce z tego podejścia)

1. **Outer jako arrow function** — mój pierwotny błąd. `return (...args) => {...}` → arrow nie ma własnego `this`, więc `debounced.apply({value: 42})` nie ma czego ustawić → test kontekstu wywala się. Fix: `return function (...args) {...}`.
2. **`fn(...args)` zamiast `fn.apply(this, args)`** — nawet z poprawnym `this` na outer, gołe `fn(...args)` woła `fn` bez kontekstu → `this` w `fn` przepada. Trzeba forwardować jawnie.
3. **`currentTimerId: number`** — fałszywa deklaracja. Sygnatura `setTimeout(...): number` pochodzi z `lib.dom.d.ts`; pod Bun/Node runtime zwraca **obiekt `Timeout`**, nie liczbę (`typeof id === "object"`). Nie wybucha od razu (bo `clearTimeout` przyjmuje ten sam typ), ale jest latentnym błędem. Fix: `ReturnType<typeof setTimeout>`.
4. **Callback w `setTimeout` jako zwykła `function`** — zamiana arrow → `function` w callbacku ponownie gubi `this` (patrz sekwencja wyżej). Callback **musi** zostać arrow.
5. **Brak `this: unknown` po zamianie arrow → `function`** — pod `strict` (`noImplicitThis`) TS rzuca `ts(2683)`: `this` implicitly `any`. Fix to jawna adnotacja `this: unknown` jako pierwszy (fałszywy) parametr. `unknown`, nie `any` — bo `this` tylko przekazujesz przez `apply`, nie dotykasz go.

### Talking points (na rozmowie)

- „Outer robię `function`, żeby **przyjął** `this`; inner robię arrow, żeby ten `this` **przetrwał** do odpalenia timera — arrow łapie `this` leksykalnie, zwykła function dostałaby kontekst od `setTimeout`, czyli żaden."
- „Handle timera typuję przez `ReturnType<typeof setTimeout>` — przenośnie, bez wiązania się z konkretnym runtime. Sygnatura DOM kłamie, że to `number`; pod Node/Bun to obiekt."
- „`this` typuję jako `this: unknown`, nie `any` — bo pod `strict` zwykła `function` wymaga jawnej deklaracji `this`, a ja ten `this` tylko przepuszczam przez `apply`, nie konsumuję go. `unknown` daje przekazywanie bez ślepego ufania."
- Use cases: search input (czekaj aż user przestanie pisać), window resize, ochrona przed double-click.
- **debounce vs throttle:** debounce odpala _po_ ciszy (reset przy każdym callu); throttle odpala _co_ `delay` niezależnie od liczby wywołań (rate limit). Różne narzędzia do różnych problemów.

### Complexity

- Czas: O(1) na wywołanie (clear + set timera).
- Pamięć: O(1) — jeden handle w closure na instancję. Osobne instancje = osobne closures, nie współdzielą stanu.

### Related

- **throttle** — bliźniak, inna semantyka odpalania.
- **`this` binding** — call/apply/bind, arrow vs function, utrata kontekstu przez granicę async (setTimeout, event handlery, callbacki).
- **closures** — `currentTimerId` żyje w domknięciu między wywołaniami.
- **memoize** — inny HOF z prywatnym stanem w closure (cache zamiast timera).

## Length<T> — Tuple Length & Type-Level Programming

**Kategoria:** TS type system — indexed access, tuple arity
**Źródło:** Frontend Masters / type-challenges 1.1

### Insight

Tupla pamięta swoją arność jako **literał liczbowy**. `T["length"]` (indexed access
na typie) wyciąga ten literał. Zwykły `string[]` / `T[]` o nieznanej długości ma
`length: number` — bez literału. To właśnie test na różnicę **tupla vs array**.

Głębszy insight: to nie jest "runtime'owe liczenie zrobione dziwnie". To **obliczenie
na poziomie typów** wykonane przez `tsc` w czasie kompilacji, którego wynik konsumuje
kompilator i edytor — nie działający kod. `arr.length` i `Length<T>` żyją w dwóch
nieprzecinających się światach (typy są **wymazywane / type erasure** przed runtime).

### Canonical implementation

```typescript
type Length<T extends readonly unknown[]> = T["length"];
```

W zadaniu wystarczy `readonly string[]`, ale `readonly unknown[]` jest ogólniejsze —
długość nie zależy od typu elementów.

### Pitfalls (w tym moje z sesji)

1. **[mój anti-pattern]** Napisałem `type Length<T extends string[]> = (arr: T) => number`
   — pomyliłem _opisanie typu funkcji_ z _odczytaniem informacji z typu_. Prawa strona
   type aliasu to NIE ciało funkcji; nie ma tam "return length". Mam **sięgnąć** po
   property typu (indexed access), nie budować sygnaturę funkcji.
2. **Constraint `string[]` odrzuca `as const`.** `typeof tesla` przy `as const` to
   `readonly [...]`, a readonly tupla NIE jest assignable do mutable `string[]`.
   Trzeba `readonly string[]`. Błąd wyskakuje "o krok obok" — przy liniach testowych,
   nie przy definicji.
3. **`string` ma `.length` → zwraca `number`, nie literał.** Case `Length<'hello world'>`
   failuje **dzięki constraintowi** (`string` nie jest assignable do `readonly string[]`),
   a NIE dzięki body. Nawet gdyby wpuścić stringa, `"hello world"["length"]` = `number`,
   nie `11`. Wiedz który mechanizm broni którego case'a — na rozmowie drążą "a co jeśli...".
4. **Inference tupli wymaga `const`.** `function f<T extends readonly unknown[]>(a: T)`
   przy `f([1,2,3])` daje `T = number[]` → `length: number`. Żeby dostać literał:
   `<const T ...>` albo `as const` po stronie callera.

### Talking points

- **"Po co komu type-level programming, skoro można runtime'owo?"**
  → _"Bo przesuwa błędy z runtime do compile-time, a typ wyniku potrafi zależeć od
  wejścia, czego runtime nie zakomunikuje edytorowi."_ Dojrzała odpowiedź, nie wykuta regułka.
- Rozwinięcie: type erasure = dwa światy (czas kompilacji vs runtime). Type-level daje:
  autocomplete, wyłapanie błędu PRZED uruchomieniem, dokumentację która nie kłamie
  (bo inaczej kod się nie kompiluje), bezpieczny refactor (tsc pokazuje wszystkie miejsca).
- Gdzie to realnie zarabia (nie w liczeniu tablic): Next.js route params z literału
  (`"/users/:id"` → `{ id: string }`), Zod `z.infer`, tRPC, Drizzle/Prisma, otypowane
  generyczne komponenty (`<Table columns data />`). `Length` to **kata** ucząca mechanizmu
  (indexed access + arność tupli), nie produkcyjne narzędzie.
- Kiedy NIE iść w typy: koszt = wolniejsza kompilacja, koszmarne error messages,
  czytelność dla zespołu. Jeśli gwarancję da się mieć runtime'owo (Zod na granicy API)
  albo nie jest w ogóle potrzebna — nie rób galaxy-brain conditional types z `infer`
  na trzech poziomach. Dojrzałość = wiedzieć, kiedy gwarancja compile-time jest warta
