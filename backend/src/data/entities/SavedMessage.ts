import { Column, Entity, PrimaryColumn } from "typeorm";
import { createEncryptedJsonTransformer } from "../encryptedJsonTransformer";

export interface ISavedMessageData {
  attachments?: object[];
  author: {
    username: string;
    discriminator: string;
  };
  content: string;
  embeds?: object[];
  timestamp: number;
}

@Entity("messages")
export class SavedMessage {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column() guild_id: string;

  @Column() channel_id: string;

  @Column() user_id: string;

  @Column() is_bot: boolean;

  @Column({
    type: "mediumtext",
    transformer: createEncryptedJsonTransformer<ISavedMessageData>(),
  })
  data: ISavedMessageData;

  @Column() posted_at: string;

  @Column() deleted_at: string;

  @Column() is_permanent: boolean;
}
