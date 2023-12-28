import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("member_cache")
export class MemberCacheItem {
  @PrimaryGeneratedColumn() id: number;

  @Column() guild_id: string;

  @Column() user_id: string;

  @Column() username: string;

  @Column({ type: String, nullable: true }) nickname: string | null;

  @Column("simple-json") roles: string[];

  @Column() last_seen: string;

  @Column({ type: String, nullable: true }) delete_at: string | null;
}
