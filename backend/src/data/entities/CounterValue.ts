import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("counter_values")
export class CounterValue {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  counter_id: number;

  @Column({ type: "bigint" })
  channel_id: string;

  @Column({ type: "bigint" })
  user_id: string;

  @Column()
  value: number;
}
