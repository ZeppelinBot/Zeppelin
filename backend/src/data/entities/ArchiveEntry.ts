import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("archives")
export class ArchiveEntry {
  @Column()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column() guild_id: string;

  @Column() body: string;

  @Column() created_at: string;

  @Column() expires_at: string;
}
