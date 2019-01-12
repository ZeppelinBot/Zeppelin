import { Entity, Column, PrimaryColumn } from "typeorm";
import { ISavedMessageData } from "./SavedMessage";

@Entity("pingable_roles")
export class PingableRole {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column() guild_id: string;

  @Column() channel_id: string;

  @Column() role_id: string;
}
