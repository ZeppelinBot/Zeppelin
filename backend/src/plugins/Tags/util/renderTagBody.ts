import { GuildPluginData } from "knub";
import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import { renderRecursively, StrictMessageContent } from "../../../utils";
import { TagsPluginType, TTag } from "../types";
import { findTagByName } from "./findTagByName";

export async function renderTagBody(
  pluginData: GuildPluginData<TagsPluginType>,
  body: TTag,
  args: unknown[] = [],
  extraData = {},
  subTagPermissionMatchParams?: ExtendedMatchParams,
): Promise<StrictMessageContent> {
  const dynamicVars = {};
  const maxTagFnCalls = 25;
  let tagFnCalls = 0;

  const data = new TemplateSafeValueContainer({
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
  });

  if (typeof body === "string") {
    // Plain text tag
    return { content: await renderTemplate(body, data) };
  } else {
    // Embed
    return renderRecursively(body, str => renderTemplate(str, data));
  }
}
