import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("auto_reactions")
export class AutoReaction {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  channel_id: string;

  @Column("simple-array") reactions: string[];
}
