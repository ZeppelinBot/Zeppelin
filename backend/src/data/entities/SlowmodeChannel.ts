import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("slowmode_channels")
export class SlowmodeChannel {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  channel_id: string;

  @Column() slowmode_seconds: number;
}
