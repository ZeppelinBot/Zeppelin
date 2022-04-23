import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("role_buttons")
export class RoleButtonsItem {
  @PrimaryGeneratedColumn() id: number;

  @Column() guild_id: string;

  @Column() name: string;

  @Column() channel_id: string;

  @Column() message_id: string;

  @Column() hash: string;
}
