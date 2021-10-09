import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("archives")
export class ArchiveEntry {
  @Column()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column() guild_id: string;

  @Column({
    type: "mediumtext",
  })
  body: string;

  @Column() created_at: string;

  @Column({ type: String, nullable: true }) expires_at: string | null;
}
