import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("name_history")
export class NameHistoryEntry {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column() guild_id: string;

  @Column() user_id: string;

  @Column() type: number;

  @Column() value: string;

  @Column() timestamp: string;
}
