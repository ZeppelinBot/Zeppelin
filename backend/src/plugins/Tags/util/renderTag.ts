import { renderTemplate } from "src/templateFormatter";
import { PluginData, plugin } from "knub";
import { TagsPluginType } from "../types";

export async function renderTag(pluginData: PluginData<TagsPluginType>, body, args = [], extraData = {}) {
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

  return renderTemplate(body, data);
}
