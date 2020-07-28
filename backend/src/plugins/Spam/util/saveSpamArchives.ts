import { SavedMessage } from "src/data/entities/SavedMessage";
import moment from "moment-timezone";
import { getBaseUrl } from "src/pluginUtils";

const SPAM_ARCHIVE_EXPIRY_DAYS = 90;

export async function saveSpamArchives(pluginData, savedMessages: SavedMessage[]) {
  const expiresAt = moment().add(SPAM_ARCHIVE_EXPIRY_DAYS, "days");
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild, expiresAt);

  return pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
}
