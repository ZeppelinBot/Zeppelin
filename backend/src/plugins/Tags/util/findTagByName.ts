import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager";
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
    const tagName = name.slice(categorySeparatorIndex + 1);

    return config.categories[categoryName]?.tags[tagName] ?? null;
  }

  // Dynamic tag
  // Format: "tag"
  const dynamicTag = await pluginData.state.tags.find(name);
  return dynamicTag?.body ?? null;
}
