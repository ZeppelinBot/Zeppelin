import { SavedMessage } from "./entities/SavedMessage";
import { Repository, getRepository } from "typeorm";

let repository: Repository<SavedMessage>;

export async function getChannelIdFromMessageId(messageId: string): Promise<string | null> {
  if (!repository) {
    repository = getRepository(SavedMessage);
  }

  const savedMessage = await repository.findOne(messageId);
  if (savedMessage) {
    return savedMessage.channel_id;
  }

  return null;
}
