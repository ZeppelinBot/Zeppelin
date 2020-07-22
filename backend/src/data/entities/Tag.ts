import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("tags")
export class Tag {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  tag: string;

  @Column() user_id: string;

  @Column() body: string;

  @Column() created_at: string;
}
