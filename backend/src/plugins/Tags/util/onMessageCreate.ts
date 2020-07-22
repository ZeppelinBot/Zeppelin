import { TagsPluginType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { PluginData } from "knub";
import { resolveMember, convertDelayStringToMS, tStrictMessageContent } from "src/utils";
import escapeStringRegexp from "escape-string-regexp";
import { validate } from "src/validatorUtils";
import { LogType } from "src/data/LogType";
import { TextChannel } from "eris";
import { renderSafeTagFromMessage } from "./renderSafeTagFromMessage";

export async function onMessageCreate(pluginData: PluginData<TagsPluginType>, msg: SavedMessage) {
  if (msg.is_bot) return;
  if (!msg.data.content) return;

  const member = await resolveMember(pluginData.client, pluginData.guild, msg.user_id);
  if (!member) return;

  const config = pluginData.config.getMatchingConfig({ member, channelId: msg.channel_id });
  let deleteWithCommand = false;

  // Find potential matching tag, looping through categories first and checking dynamic tags last
  let renderedTag = null;
  let matchedTagName;
  const cooldowns = [];

  for (const [name, category] of Object.entries(config.categories)) {
    const canUse = category.can_use != null ? category.can_use : config.can_use;
    if (canUse !== true) continue;

    const prefix = category.prefix != null ? category.prefix : config.prefix;
    if (prefix !== "" && !msg.data.content.startsWith(prefix)) continue;

    const withoutPrefix = msg.data.content.slice(prefix.length);

    for (const [tagName, tagBody] of Object.entries(category.tags)) {
      const regex = new RegExp(`^${escapeStringRegexp(tagName)}(?:\\s|$)`);
      if (regex.test(withoutPrefix)) {
        renderedTag = await renderSafeTagFromMessage(
          pluginData,
          msg.data.content,
          prefix,
          tagName,
          category.tags[tagName],
          member,
        );
        if (renderedTag) {
          matchedTagName = tagName;
          break;
        }
      }
    }

    if (renderedTag) {
      if (category.user_tag_cooldown) {
        const delay = convertDelayStringToMS(String(category.user_tag_cooldown), "s");
        cooldowns.push([`tags-category-${name}-user-${msg.user_id}-tag-${matchedTagName}`, delay]);
      }
      if (category.global_tag_cooldown) {
        const delay = convertDelayStringToMS(String(category.global_tag_cooldown), "s");
        cooldowns.push([`tags-category-${name}-tag-${matchedTagName}`, delay]);
      }
      if (category.user_category_cooldown) {
        const delay = convertDelayStringToMS(String(category.user_category_cooldown), "s");
        cooldowns.push([`tags-category-${name}-user--${msg.user_id}`, delay]);
      }
      if (category.global_category_cooldown) {
        const delay = convertDelayStringToMS(String(category.global_category_cooldown), "s");
        cooldowns.push([`tags-category-${name}`, delay]);
      }

      deleteWithCommand =
        category.delete_with_command != null ? category.delete_with_command : config.delete_with_command;

      break;
    }
  }

  // Matching tag was not found from the config, try a dynamic tag
  if (!renderedTag) {
    if (config.can_use !== true) return;

    const prefix = config.prefix;
    if (!msg.data.content.startsWith(prefix)) return;

    const tagNameMatch = msg.data.content.slice(prefix.length).match(/^\S+/);
    if (tagNameMatch === null) return;

    const tagName = tagNameMatch[0];
    const tag = await pluginData.state.tags.find(tagName);
    if (!tag) return;

    matchedTagName = tagName;

    renderedTag = await renderSafeTagFromMessage(pluginData, msg.data.content, prefix, tagName, tag.body, member);
  }

  if (!renderedTag) return;

  if (config.user_tag_cooldown) {
    const delay = convertDelayStringToMS(String(config.user_tag_cooldown), "s");
    cooldowns.push([`tags-user-${msg.user_id}-tag-${matchedTagName}`, delay]);
  }

  if (config.global_tag_cooldown) {
    const delay = convertDelayStringToMS(String(config.global_tag_cooldown), "s");
    cooldowns.push([`tags-tag-${matchedTagName}`, delay]);
  }

  if (config.user_cooldown) {
    const delay = convertDelayStringToMS(String(config.user_cooldown), "s");
    cooldowns.push([`tags-user-${matchedTagName}`, delay]);
  }

  if (config.global_cooldown) {
    const delay = convertDelayStringToMS(String(config.global_cooldown), "s");
    cooldowns.push([`tags`, delay]);
  }

  const isOnCooldown = cooldowns.some(cd => pluginData.cooldowns.isOnCooldown(cd[0]));
  if (isOnCooldown) return;

  for (const cd of cooldowns) {
    pluginData.cooldowns.setCooldown(cd[0], cd[1]);
  }

  deleteWithCommand = config.delete_with_command;

  const validationError = await validate(tStrictMessageContent, renderedTag);
  if (validationError) {
    pluginData.state.logs.log(LogType.BOT_ALERT, {
      body: `Rendering tag ${matchedTagName} resulted in an invalid message: ${validationError.message}`,
    });
    return;
  }

  const channel = pluginData.guild.channels.get(msg.channel_id) as TextChannel;
  const responseMsg = await channel.createMessage(renderedTag);

  // Save the command-response message pair once the message is in our database
  if (deleteWithCommand) {
    pluginData.state.savedMessages.onceMessageAvailable(responseMsg.id, async () => {
      await pluginData.state.tags.addResponse(msg.id, responseMsg.id);
    });
  }
}
