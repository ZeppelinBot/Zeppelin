import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("phisherman_key_cache")
export class PhishermanKeyCacheEntry {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column()
  hash: string;

  @Column()
  is_valid: boolean;

  @Column()
  expires_at: string;
}
