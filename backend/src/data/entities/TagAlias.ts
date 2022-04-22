import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("tag_aliases")
export class TagAlias {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  alias: string;

  @Column()
  @PrimaryColumn()
  tag: string;

  @Column() user_id: string;

  @Column() created_at: string;
}
