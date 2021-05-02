import { renderTemplate } from "../../../templateFormatter";
import { GuildPluginData } from "knub";
import { Tag, TagsPluginType } from "../types";
import { renderRecursively, StrictMessageContent } from "../../../utils";
import * as t from "io-ts";
import { findTagByName } from "./findTagByName";
import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager";

export async function renderTagBody(
  pluginData: GuildPluginData<TagsPluginType>,
  body: t.TypeOf<typeof Tag>,
  args: any[] = [],
  extraData = {},
  subTagPermissionMatchParams?: ExtendedMatchParams,
): Promise<StrictMessageContent> {
  const dynamicVars = {};
  const maxTagFnCalls = 25;
  let tagFnCalls = 0;

  const data = {
    args,
    ...extraData,
    ...pluginData.state.tagFunctions,
    set(name, val) {
      if (typeof name !== "string") return;
      dynamicVars[name] = val;
    },
    setr(name, val) {
      if (typeof name !== "string") return "";
      dynamicVars[name] = val;
      return val;
    },
    get(name) {
      return dynamicVars[name] == null ? "" : dynamicVars[name];
    },
    tag: async (name, ...subTagArgs) => {
      if (tagFnCalls++ > maxTagFnCalls) return "\\_recursion\\_";
      if (typeof name !== "string") return "";
      if (name === "") return "";

      const subTagBody = await findTagByName(pluginData, name, subTagPermissionMatchParams);

      if (!subTagBody) {
        return "";
      }

      if (typeof subTagBody !== "string") {
        return "<embed>";
      }

      const rendered = await renderTagBody(pluginData, subTagBody, subTagArgs, subTagPermissionMatchParams);
      return rendered.content!;
    },
  };

  if (typeof body === "string") {
    // Plain text tag
    return { content: await renderTemplate(body, data) };
  } else {
    // Embed
    return renderRecursively(body, str => renderTemplate(str, data));
  }
}
