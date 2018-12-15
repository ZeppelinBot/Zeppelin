import { Entity, Column, PrimaryColumn, OneToMany, ManyToOne, JoinColumn, OneToOne } from "typeorm";
import { Starboard } from "./Starboard";
import { Case } from "./Case";
import { SavedMessage } from "./SavedMessage";

@Entity("starboard_messages")
export class StarboardMessage {
  @Column()
  @PrimaryColumn()
  starboard_id: number;

  @Column()
  @PrimaryColumn()
  message_id: string;

  @Column() starboard_message_id: string;

  @ManyToOne(type => Starboard, sb => sb.starboardMessages)
  @JoinColumn({ name: "starboard_id" })
  starboard: Starboard;

  @OneToOne(type => SavedMessage)
  @JoinColumn({ name: "message_id" })
  message: SavedMessage;
}
