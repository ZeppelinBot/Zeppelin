import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { getBaseUrl } from "../../../pluginUtils";
import { SpamPluginType } from "../types";

const SPAM_ARCHIVE_EXPIRY_DAYS = 90;

export async function saveSpamArchives(pluginData: GuildPluginData<SpamPluginType>, savedMessages: SavedMessage[]) {
  const expiresAt = moment.utc().add(SPAM_ARCHIVE_EXPIRY_DAYS, "days");
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild, expiresAt);

  return pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
}
