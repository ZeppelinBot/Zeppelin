import { Entity, Column, PrimaryColumn } from "typeorm";
import { Attachment } from "eris";
import { StrictMessageContent } from "../../utils";

@Entity("scheduled_posts")
export class ScheduledPost {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column() guild_id: string;

  @Column() author_id: string;

  @Column() author_name: string;

  @Column() channel_id: string;

  @Column("simple-json") content: StrictMessageContent;

  @Column("simple-json") attachments: Attachment[];

  @Column() post_at: string;

  @Column() enable_mentions: boolean;
}
