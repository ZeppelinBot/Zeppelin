import { Column, Entity, PrimaryColumn } from "typeorm";
import { PhishermanDomainInfo } from "../types/phisherman";

@Entity("phisherman_cache")
export class PhishermanCacheEntry {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column()
  domain: string;

  @Column("simple-json")
  data: PhishermanDomainInfo;

  @Column()
  expires_at: string;
}
