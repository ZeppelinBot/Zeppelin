import { Entity, Column, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity("tag_responses")
export class TagResponse {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column() guild_id: string;

  @Column() command_message_id: string;

  @Column() response_message_id: string;
}
