import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("persisted_data")
export class PersistedData {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column("simple-array") roles: string[];

  @Column() nickname: string;

  @Column() is_voice_muted: number;
}
