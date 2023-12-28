import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export const TRIGGER_COMPARISON_OPS = ["=", "!=", ">", "<", ">=", "<="] as const;

export type TriggerComparisonOp = (typeof TRIGGER_COMPARISON_OPS)[number];

const REVERSE_OPS: Record<TriggerComparisonOp, TriggerComparisonOp> = {
  "=": "!=",
  "!=": "=",
  ">": "<=",
  "<": ">=",
  ">=": "<",
  "<=": ">",
};

export function getReverseCounterComparisonOp(op: TriggerComparisonOp): TriggerComparisonOp {
  return REVERSE_OPS[op];
}

const comparisonStringRegex = new RegExp(`^(${TRIGGER_COMPARISON_OPS.join("|")})(\\d*)$`);

/**
 * @return Parsed comparison op and value, or null if the comparison string was invalid
 */
export function parseCounterConditionString(str: string): [TriggerComparisonOp, number] | null {
  const matches = str.match(comparisonStringRegex);
  return matches ? [matches[1] as TriggerComparisonOp, parseInt(matches[2], 10)] : null;
}

export function buildCounterConditionString(comparisonOp: TriggerComparisonOp, comparisonValue: number): string {
  return `${comparisonOp}${comparisonValue}`;
}

export function isValidCounterComparisonOp(op: string): boolean {
  return TRIGGER_COMPARISON_OPS.includes(op as any);
}

@Entity("counter_triggers")
export class CounterTrigger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  counter_id: number;

  @Column()
  name: string;

  @Column({ type: "varchar" })
  comparison_op: TriggerComparisonOp;

  @Column()
  comparison_value: number;

  @Column({ type: "varchar" })
  reverse_comparison_op: TriggerComparisonOp;

  @Column()
  reverse_comparison_value: number;

  @Column({ type: "datetime", nullable: true })
  delete_at: string | null;
}
