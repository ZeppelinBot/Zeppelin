import { GuildMember } from "discord.js";
import escapeStringRegexp from "escape-string-regexp";
import { GuildPluginData } from "knub";
import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager";
import { StrictMessageContent } from "../../../utils";
import { TagsPluginType, TTagCategory } from "../types";
import { renderTagFromString } from "./renderTagFromString";

interface BaseResult {
  renderedContent: StrictMessageContent;
  tagName: string;
}

type ResultWithCategory = BaseResult & {
  categoryName: string;
  category: TTagCategory;
};

type ResultWithoutCategory = BaseResult & {
  categoryName: null;
  category: null;
};

type Result = ResultWithCategory | ResultWithoutCategory;

export async function matchAndRenderTagFromString(
  pluginData: GuildPluginData<TagsPluginType>,
  str: string,
  member: GuildMember,
  extraMatchParams: ExtendedMatchParams = {},
): Promise<Result | null> {
  const config = await pluginData.config.getMatchingConfig({
    ...extraMatchParams,
    member,
  });

  // Hard-coded tags in categories
  for (const [name, category] of Object.entries(config.categories)) {
    const canUse = category.can_use != null ? category.can_use : config.can_use;
    if (canUse !== true) continue;

    const prefix = category.prefix != null ? category.prefix : config.prefix;
    if (prefix !== "" && !str.startsWith(prefix)) continue;

    const withoutPrefix = str.slice(prefix.length);

    for (const [tagName, tagBody] of Object.entries(category.tags)) {
      const regex = new RegExp(`^${escapeStringRegexp(tagName)}(?:\\s|$)`);
      if (regex.test(withoutPrefix)) {
        const renderedContent = await renderTagFromString(
          pluginData,
          str,
          prefix,
          tagName,
          category.tags[tagName],
          member,
        );

        if (renderedContent == null) {
          return null;
        }

        return {
          renderedContent,
          tagName,
          categoryName: name,
          category,
        };
      }
    }
  }

  // Dynamic tags
  if (config.can_use !== true) {
    return null;
  }

  const dynamicTagPrefix = config.prefix;
  if (!str.startsWith(dynamicTagPrefix)) {
    return null;
  }

  const dynamicTagNameMatch = str.slice(dynamicTagPrefix.length).match(/^\S+/);
  if (dynamicTagNameMatch === null) {
    return null;
  }

  const dynamicTagName = dynamicTagNameMatch[0];
  const dynamicTag = await pluginData.state.tags.find(dynamicTagName);
  if (!dynamicTag) {
    return null;
  }

  const renderedDynamicTagContent = await renderTagFromString(
    pluginData,
    str,
    dynamicTagPrefix,
    dynamicTagName,
    dynamicTag.body,
    member,
  );

  if (renderedDynamicTagContent == null) {
    return null;
  }

  return {
    renderedContent: renderedDynamicTagContent,
    tagName: dynamicTagName,
    categoryName: null,
    category: null,
  };
}
