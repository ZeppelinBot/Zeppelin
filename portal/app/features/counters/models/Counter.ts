import { CounterSchema } from "#database/schema";

export class Counter extends CounterSchema {
  static table = "counters";
}

export default Counter;
