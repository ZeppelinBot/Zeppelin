import { SavedMessage } from "../../../data/entities/SavedMessage";
import moment from "moment-timezone";
import { getBaseUrl } from "../../../pluginUtils";
import { GuildPluginData } from "knub";
import { SpamPluginType } from "../types";

const SPAM_ARCHIVE_EXPIRY_DAYS = 90;

export async function saveSpamArchives(pluginData: GuildPluginData<SpamPluginType>, savedMessages: SavedMessage[]) {
  const expiresAt = moment.utc().add(SPAM_ARCHIVE_EXPIRY_DAYS, "days");
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild, expiresAt);

  return pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
}
