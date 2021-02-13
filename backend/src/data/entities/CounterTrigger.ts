import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export const TRIGGER_COMPARISON_OPS = ["=", "!=", ">", "<", ">=", "<="] as const;

export type TriggerComparisonOp = typeof TRIGGER_COMPARISON_OPS[number];

@Entity("counter_triggers")
export class CounterTrigger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  counter_id: number;

  @Column({ type: "varchar" })
  comparison_op: TriggerComparisonOp;

  @Column()
  comparison_value: number;

  @Column({ type: "datetime", nullable: true })
  delete_at: string | null;
}
