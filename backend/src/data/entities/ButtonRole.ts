import { Column, Entity, PrimaryColumn, Unique } from "typeorm";

@Entity("button_roles")
export class ButtonRole {
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
  button_id: string;

  @Column() button_group: string;

  @Column() button_name: string;
}
