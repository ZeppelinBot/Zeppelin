import { renderTemplate } from "../../../templateFormatter";
import { PluginData, plugin } from "knub";
import { Tag, TagsPluginType } from "../types";
import { renderRecursively, StrictMessageContent } from "../../../utils";
import * as t from "io-ts";

export async function renderTagBody(
  pluginData: PluginData<TagsPluginType>,
  body: t.TypeOf<typeof Tag>,
  args = [],
  extraData = {},
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
    get(name) {
      return dynamicVars[name] == null ? "" : dynamicVars[name];
    },
    tag: async (name, ...subTagArgs) => {
      if (tagFnCalls++ > maxTagFnCalls) return "\\_recursion\\_";
      if (typeof name !== "string") return "";
      if (name === "") return "";

      // TODO: Incorporate tag categories here
      const subTag = await pluginData.state.tags.find(name);
      if (!subTag) return "";
      return renderTemplate(subTag.body, { ...data, args: subTagArgs });
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
