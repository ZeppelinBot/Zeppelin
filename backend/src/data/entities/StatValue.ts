import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("stats")
export class StatValue {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  guild_id: string;

  @Column()
  source: string;

  @Column() key: string;

  @Column() value: number;

  @Column() created_at: string;
}
