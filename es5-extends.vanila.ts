// bun test src/problems/06-es5-extends/test/es5-extends.test.ts

export const myExtends = <
  S extends (...args: any[]) => any,
  T extends (...args: any[]) => any,
>(
  SuperType: S,
  SubType: T,
) => {
  // Step 1: Create a new constructor function MyType(this, ...args)
  const extended = function MyType(
    this: unknown,
    ...args: [...Parameters<S>, ...Parameters<T>]
  ) {
    SuperType.apply(this, args);
    SubType.apply(this, args);
  };
  // Step 2: Set up prototype chain
  Object.setPrototypeOf(SubType.prototype, SuperType.prototype);
  extended.prototype = Object.create(SubType.prototype);
  // Step 3: Set up static/constructor inheritance
  // Step 4: Return MyType
};

// --- Examples ---
// Uncomment to test your implementation:

// function Animal(this: any, name: string) { this.name = name }
// Animal.print = () => { console.log('Animal') }
// Animal.prototype.greet = function () { return `Hello, ${this.name}` }
//
// function Dog(this: any) { this.breed = 'Labrador' }
// Dog.prototype.bark = function () { return `${this.name} says Woof!` }
//
// const DogExtended = myExtends(Animal, Dog)
// const dog = new (DogExtended as any)('Rex')
// console.log(dog.name)    // Expected: "Rex"
// console.log(dog.breed)   // Expected: "Labrador"
// console.log(dog.greet()) // Expected: "Hello, Rex"
// console.log(dog.bark())  // Expected: "Rex says Woof!"
// console.log(dog instanceof Animal) // Expected: true
// (DogExtended as any).print() // Expected: "Animal"
