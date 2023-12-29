import { Repository } from "typeorm";
import { dataSource } from "./dataSource";
import { SavedMessage } from "./entities/SavedMessage";

let repository: Repository<SavedMessage>;

export async function getChannelIdFromMessageId(messageId: string): Promise<string | null> {
  if (!repository) {
    repository = dataSource.getRepository(SavedMessage);
  }

  const savedMessage = await repository.findOne({ where: { id: messageId } });
  if (savedMessage) {
    return savedMessage.channel_id;
  }

  return null;
}
