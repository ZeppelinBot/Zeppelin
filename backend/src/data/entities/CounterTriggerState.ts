import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("counter_trigger_states")
export class CounterTriggerState {
  @Column({ type: "bigint", generated: "increment" })
  @PrimaryColumn()
  id: string;

  @Column()
  trigger_id: number;

  @Column({ type: "bigint" })
  channel_id: string;

  @Column({ type: "bigint" })
  user_id: string;
}
