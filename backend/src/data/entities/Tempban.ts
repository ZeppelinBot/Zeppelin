import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("tempbans")
export class Tempban {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column() mod_id: string;

  @Column() created_at: string;

  @Column() expires_at: string;
}
