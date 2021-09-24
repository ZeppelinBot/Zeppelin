import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("allowed_guilds")
export class AllowedGuild {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: String, nullable: true })
  icon: string | null;

  @Column()
  owner_id: string;

  @Column()
  created_at: string;

  @Column()
  updated_at: string;
}
