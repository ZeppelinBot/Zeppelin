import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("self_grantable_roles")
export class SelfGrantableRole {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column() guild_id: string;

  @Column() channel_id: string;

  @Column() role_id: string;

  @Column("simple-array") aliases: string[];
}
