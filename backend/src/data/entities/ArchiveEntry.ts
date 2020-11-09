import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { createEncryptedTextTransformer } from "../encryptedTextTransformer";

@Entity("archives")
export class ArchiveEntry {
  @Column()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column() guild_id: string;

  @Column({
    type: "mediumtext",
    transformer: createEncryptedTextTransformer(),
  })
  body: string;

  @Column() created_at: string;

  @Column({ nullable: true }) expires_at: string | null;
}
