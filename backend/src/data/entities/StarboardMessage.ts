import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { SavedMessage } from "./SavedMessage";

@Entity("starboard_messages")
export class StarboardMessage {
  @Column()
  message_id: string;

  @Column()
  @PrimaryColumn()
  starboard_message_id: string;

  @Column()
  starboard_channel_id: string;

  @Column()
  guild_id: string;

  @OneToOne((type) => SavedMessage)
  @JoinColumn({ name: "message_id" })
  message: SavedMessage;
}
