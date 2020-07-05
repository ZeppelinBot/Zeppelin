import { utilityCmd } from "../types";
import { baseTypeHelpers as t } from "knub";
import { archiveSearch, displaySearch, SearchType } from "./search";

// Separate from BanSearchCmd to avoid a circular reference from ./search.ts
export const banSearchSignature = {
  query: t.string({ catchAll: true }),

  page: t.number({ option: true, shortcut: "p" }),
  sort: t.string({ option: true }),
  "case-sensitive": t.switchOption({ shortcut: "cs" }),
  export: t.switchOption({ shortcut: "e" }),
  ids: t.switchOption(),
  regex: t.switchOption({ shortcut: "re" }),
};

export const BanSearchCmd = utilityCmd({
  trigger: ["bansearch", "bs"],
  description: "Search banned users",
  usage: "!bansearch dragory",
  permission: "can_search",

  signature: banSearchSignature,

  run({ pluginData, message, args }) {
    if (args.export) {
      return archiveSearch(pluginData, args, SearchType.BanSearch, message);
    } else {
      return displaySearch(pluginData, args, SearchType.BanSearch, message);
    }
  },
});
