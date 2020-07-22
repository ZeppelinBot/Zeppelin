import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("allowed_guilds")
export class AllowedGuild {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column()
  owner_id: string;
}
