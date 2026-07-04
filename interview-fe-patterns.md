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

  ### First<T> — pierwszy element tuple (type-challenges #14)

**Key insight:** `T[0]` dla `[]` zwraca `undefined`, nie `never`
(index poza zakresem). Odróżnienie "puste" od "[undefined]" wymaga
sprawdzenia length ALBO pattern matchingu na kształcie tuple.

**Canonical (idiomatic):**
type First<T extends readonly any[]> =
T extends readonly [infer F, ...any[]] ? F : never;

**Alternatywa (length-based):**
type First<T extends readonly any[]> =
T["length"] extends 0 ? never : T[0];

**Pitfalls:**

- ❌ `T[0]` samo → dla [] daje undefined, nie never
- ❌ `T[0] extends undefined ? never : T[0]` → psuje [undefined]
- tuple ma LITERALNĄ length (0,1,2...); zwykła tablica ma length: number

**Talking point:** "brak elementu" ≠ "element === undefined".
`[infer F, ...]` nie dopasuje pustego tuple → never za darmo.

**Related:** Last<T> (`[...any[], infer L]`), Tail<T>, Length<T>

## throttle — leading + trailing edge

**Problem:** Senior FE Prep. Zaimplementuj `throttle`, które pali na leading edge, gwarantuje wypalenie ostatniego calla w serii (trailing), i nigdy nie strzela częściej niż raz na `delay`.

**Key insight:** Throttle = „pal natychmiast na wejściu do okna, potem najwyżej raz na `delay`, ale nie zgub ostatniego calla". Leading i trailing muszą się **wzajemnie wykluczać w obrębie jednego okna** — jeśli jeden wypala, drugi nie może dopalić w tym samym oknie. To jest oś całego problemu.

**Canonical implementation:**

```typescript
export function throttle<F extends (...args: any[]) => void>(
  fn: F,
  delay: number,
): (...args: Parameters<F>) => void {
  let lastTime = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let freshArgs: Parameters<F>;

  return function throttled(this: unknown, ...args: Parameters<F>) {
    freshArgs = args; // odświeżane co call — trailing strzeli najświeższymi

    if (Date.now() - lastTime > delay && !timerId) {
      // leading: okno minęło I żaden trailing nie tyka
      fn.apply(this, args);
      lastTime = Date.now();
    } else if (timerId === null) {
      // trailing: zaplanuj raz, callback czyta freshArgs (nie args!)
      timerId = setTimeout(() => {
        fn.apply(this, freshArgs);
        lastTime = Date.now(); // symetria do leading — inaczej double-fire
        timerId = null;
      }, delay);
    }
  };
}
```

**Pitfalls (w tym własne anti-patterny):**

1. **Stale args.** Domknięcie nad parametrem `args` łapie dane z calla, który _założył_ timer, nie z ostatniego w oknie. Objaw: trailing strzela `pos2`, gdy user zatrzymał się na `pos3`. Fix: `freshArgs` w scope domknięcia, nadpisywane na górze każdego wywołania; callback czyta `freshArgs`.
2. **Brak `lastTime = Date.now()` w callbacku trailinga.** Po strzale trailinga `lastTime` wskazuje stary leading → następny call liczy `now - lastTime > delay` od zamierzchłego punktu i pali za wcześnie → dwa strzały bliżej niż `delay`. (Potknięcie x2 tej sesji — warte osobnej flashcardy.)
3. **Leading pali, gdy trailing wciąż pending.** Okno minęło, ale uzbrojony wcześniej timer nikt nie rozbroił → leading strzela + timer dopala chwilę później → złamany rate limit. Dwie poprawne obrony:
   - `&& !timerId` w warunku leading — _suppress_ leading, dopóki timer tyka (wersja powyżej; leniwsza, prostsza, zero `clearTimeout` w throttle).
   - `clearTimeout(timerId)` w gałęzi leading — anuluj zbędny trailing (responsywniejsza, pali od razu). Uwaga: `clearTimeout` w throttle jest OK **tylko** w tej gałęzi — w gałęzi „każdy call" byłby debounce'owym resetem okna.
4. **`ReturnType<typeof Date.now>` = cargo-cult.** `Date.now()` jest zabetonowane w ECMA-262 do `(): number` w każdym runtime → to tylko `number` owinięty w szum. Kontrast: `ReturnType<typeof setTimeout>` **jest** uzasadnione, bo typ id timera różni się runtime (browser `number` vs Node `NodeJS.Timeout`). Kryterium: `ReturnType<>` zarabia, gdy typ realnie się waha albo chcesz sprzężenia z czymś poza Twoją kontrolą; odpuść, gdy jest ustalony specyfikacją.

**Notes:**

- `lastTime = 0` (nie `Date.now()`) na starcie — celowe. `0` to „prehistoria" względem realnego `Date.now()` (~1.7e12 ms), więc pierwszy call zawsze pali jako leading. `Date.now()` na starcie zablokowałby pierwszy leading edge.
- `!timerId` działa (id timera zawsze truthy: Node → obiekt, browser → dodatnia liczba), ale dla spójności z `timerId === null` w `else if` rozważ `=== null` w obu miejscach.
- **Opcjonalnie otwarte:** pairing `this`. Arrow-callback łapie `this` z calla, który założył timer, a `freshArgs` z ostatniego → rozjazd, gdy różne `this` w oknie. Fix symetryczny: `freshThis`. W praktyce throttle wisi na jednym kontekście, więc rzadko boli.

**Complexity:** O(1) czasu i pamięci na wywołanie.

**Talking points (rozmowa):**

- Leading vs trailing edge — umieć narysować timeline z burstem `a/b/c`.
- throttle ≠ debounce: debounce resetuje okno (`clearTimeout` co call), throttle gwarantuje regularność. Ciągły scroll przez 10 s przy `delay=300`: debounce strzela **0 razy** w trakcie (dopiero po ustaniu), throttle ~33 razy.
- Wzajemne wykluczanie leading/trailing w oknie (pitfall 3) — mało kto łapie bez podpowiedzi, mocny sygnał.
- `ReturnType<typeof setTimeout>` justified vs `Date.now` cargo-cult (pitfall 4) — pokazuje dojrzałość w TS.

**Related:** `debounce` (dual role of `this`, `ReturnType<typeof setTimeout>`), leading/trailing edge, lodash `_.throttle` / `_.debounce`.
