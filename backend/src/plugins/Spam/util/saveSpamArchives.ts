import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { getBaseUrl } from "../../../pluginUtils.js";
import { SpamPluginType } from "../types.js";

const SPAM_ARCHIVE_EXPIRY_DAYS = 90;

export async function saveSpamArchives(pluginData: GuildPluginData<SpamPluginType>, savedMessages: SavedMessage[]) {
  const expiresAt = moment.utc().add(SPAM_ARCHIVE_EXPIRY_DAYS, "days");
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild, expiresAt);

  return pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
}
