import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager";
import { PluginData } from "knub";
import { TagsPluginType, TTagCategory } from "../types";
import { renderTagFromString } from "./renderTagFromString";
import { convertDelayStringToMS } from "../../../utils";
import escapeStringRegexp from "escape-string-regexp";
import { Member, MessageContent } from "eris";

interface Result {
  renderedContent: MessageContent;
  tagName: string;
  categoryName: string | null;
  category: TTagCategory | null;
}

export async function matchAndRenderTagFromString(
  pluginData: PluginData<TagsPluginType>,
  str: string,
  member: Member,
  extraMatchParams: ExtendedMatchParams = {},
): Promise<Result | null> {
  const config = pluginData.config.getMatchingConfig({
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
  return {
    renderedContent: renderedDynamicTagContent,
    tagName: dynamicTagName,
    categoryName: null,
    category: null,
  };
}
