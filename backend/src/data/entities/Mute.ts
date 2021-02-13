import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("mutes")
export class Mute {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column() created_at: string;

  @Column({ type: String, nullable: true }) expires_at: string | null;

  @Column() case_id: number;

  @Column("simple-array") roles_to_restore: string[];
}
