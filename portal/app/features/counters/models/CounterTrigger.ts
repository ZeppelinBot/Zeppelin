import { CounterTriggerSchema } from "#database/schema";

export class CounterTrigger extends CounterTriggerSchema {
  static table = "counter_triggers";
}

export default CounterTrigger;
