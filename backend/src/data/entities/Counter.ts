import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("counters")
export class Counter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guild_id: string;

  @Column()
  name: string;

  @Column()
  per_channel: boolean;

  @Column()
  per_user: boolean;

  @Column()
  last_decay_at: string;

  @Column({ type: "datetime", nullable: true })
  delete_at: string | null;
}
