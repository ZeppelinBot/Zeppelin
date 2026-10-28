import { CounterValueSchema } from "#database/schema";

export class CounterValue extends CounterValueSchema {
  static table = "counter_values";
}

export default CounterValue;
