import { ExtendedMatchParams, GuildPluginData } from "knub";
import { TemplateSafeValue, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter";
import { StrictMessageContent, UnknownUser, renderRecursively, resolveUser } from "../../../utils";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { TTag, TagsPluginType } from "../types";
import { findTagByName } from "./findTagByName";

const MAX_TAG_FN_CALLS = 25;

// This is used to disallow setting/getting default object properties (such as __proto__) in dynamicVars
const emptyObject = {};

export async function renderTagBody(
  pluginData: GuildPluginData<TagsPluginType>,
  body: TTag,
  args: TemplateSafeValue[] = [],
  extraData = {},
  subTagPermissionMatchParams?: ExtendedMatchParams,
  tagFnCallsObj = { calls: 0 },
): Promise<StrictMessageContent> {
  const dynamicVars = {};

  const data = new TemplateSafeValueContainer({
    args,
    ...extraData,
    ...pluginData.state.tagFunctions,
    set(name, val) {
      if (typeof name !== "string") return;
      if (emptyObject[name]) return;
      dynamicVars[name] = val;
    },
    setr(name, val) {
      if (typeof name !== "string") return "";
      if (emptyObject[name]) return;
      dynamicVars[name] = val;
      return val;
    },
    get(name) {
      if (typeof name !== "string") return "";
      if (emptyObject[name]) return;
      return !Object.hasOwn(dynamicVars, name) || dynamicVars[name] == null ? "" : dynamicVars[name];
    },
    async get_user(str) {
      if (!str || typeof str !== "string") return "";
      const resolved = await resolveUser(pluginData.client, str);
      if (resolved instanceof UnknownUser) return "";
      return userToTemplateSafeUser(resolved);
    },
    tag: async (name, ...subTagArgs) => {
      if (++tagFnCallsObj.calls > MAX_TAG_FN_CALLS) return "";
      if (typeof name !== "string") return "";
      if (name === "") return "";

      const subTagBody = await findTagByName(pluginData, name, subTagPermissionMatchParams);

      if (!subTagBody) {
        return "";
      }

      if (typeof subTagBody !== "string") {
        return "<embed>";
      }

      const rendered = await renderTagBody(
        pluginData,
        subTagBody,
        subTagArgs,
        extraData,
        subTagPermissionMatchParams,
        tagFnCallsObj,
      );
      return rendered.content!;
    },
  });

  if (typeof body === "string") {
    // Plain text tag
    return { content: await renderTemplate(body, data) };
  } else {
    // Embed
    return renderRecursively(body, (str) => renderTemplate(str, data));
  }
}
