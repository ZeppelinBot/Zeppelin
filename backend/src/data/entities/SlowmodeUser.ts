import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("slowmode_users")
export class SlowmodeUser {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  channel_id: string;

  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column() expires_at: string;
}
