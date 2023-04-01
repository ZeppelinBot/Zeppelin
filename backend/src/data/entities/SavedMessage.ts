import { Snowflake, StickerFormatType, StickerType } from "discord.js";
import { Column, Entity, PrimaryColumn } from "typeorm";

export interface ISavedMessageAttachmentData {
  id: Snowflake;
  contentType: string | null;
  name: string | null;
  proxyURL: string;
  size: number;
  spoiler: boolean;
  url: string;
  width: number | null;
}

export interface ISavedMessageEmbedData {
  title: string | null;
  description: string | null;
  url: string | null;
  timestamp: number | null;
  color: number | null;
  fields: Array<{
    name: string;
    value: string;
    inline: boolean;
  }>;
  author?: {
    name?: string;
    url?: string;
    iconURL?: string;
    proxyIconURL?: string;
  };
  thumbnail?: {
    url: string;
    proxyURL?: string;
    height?: number;
    width?: number;
  };
  image?: {
    url: string;
    proxyURL?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url?: string;
    proxyURL?: string;
    height?: number;
    width?: number;
  };
  footer?: {
    text?: string;
    iconURL?: string;
    proxyIconURL?: string;
  };
}

export interface ISavedMessageStickerData {
  format: StickerFormatType;
  guildId: Snowflake | null;
  id: Snowflake;
  name: string;
  description: string | null;
  available: boolean | null;
  type: StickerType | null;
}

export interface ISavedMessageData {
  attachments?: ISavedMessageAttachmentData[];
  author: {
    username: string;
    discriminator: string;
  };
  content: string;
  embeds?: ISavedMessageEmbedData[];
  stickers?: ISavedMessageStickerData[];
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
  })
  data: ISavedMessageData;

  @Column() posted_at: string;

  @Column() deleted_at: string;

  @Column() is_permanent: boolean;
}
