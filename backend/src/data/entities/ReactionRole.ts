import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("reaction_roles")
export class ReactionRole {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  channel_id: string;

  @Column()
  @PrimaryColumn()
  message_id: string;

  @Column()
  @PrimaryColumn()
  emoji: string;

  @Column() role_id: string;

  @Column() is_exclusive: boolean;

  @Column() order: number;
}
