import { CounterTriggerStateSchema } from "#database/schema";

export class CounterTriggerState extends CounterTriggerStateSchema {
  static table = "counter_trigger_states";
}

export default CounterTriggerState;
