import * as t from "io-ts";
import { ExtendedMatchParams, GuildPluginData } from "knub";
import { Tag, TagsPluginType } from "../types";

export async function findTagByName(
  pluginData: GuildPluginData<TagsPluginType>,
  name: string,
  matchParams: ExtendedMatchParams = {},
): Promise<t.TypeOf<typeof Tag> | null> {
  const config = await pluginData.config.getMatchingConfig(matchParams);

  // Tag from a hardcoded category
  // Format: "category.tag"
  const categorySeparatorIndex = name.indexOf(".");
  if (categorySeparatorIndex > 0) {
    const categoryName = name.slice(0, categorySeparatorIndex);
    if (!Object.hasOwn(config.categories, categoryName)) {
      return null;
    }
    const category = config.categories[categoryName];

    const tagName = name.slice(categorySeparatorIndex + 1);
    if (!Object.hasOwn(category.tags, tagName)) {
      return null;
    }
    return category.tags[tagName];
  }

  // Dynamic tag
  // Format: "tag"
  const dynamicTag = await pluginData.state.tags.find(name);
  return dynamicTag?.body ?? null;
}
