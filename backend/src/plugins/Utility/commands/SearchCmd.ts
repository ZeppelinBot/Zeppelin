import { utilityCmd } from "../types";
import { baseTypeHelpers as t } from "knub";
import { archiveSearch, displaySearch, SearchType } from "../search";

// Separate from SearchCmd to avoid a circular reference from ./search.ts
export const searchCmdSignature = {
  query: t.string({ catchAll: true }),

  page: t.number({ option: true, shortcut: "p" }),
  role: t.string({ option: true, shortcut: "r" }),
  voice: t.switchOption({ shortcut: "v" }),
  bot: t.switchOption({ shortcut: "b" }),
  sort: t.string({ option: true }),
  "case-sensitive": t.switchOption({ shortcut: "cs" }),
  export: t.switchOption({ shortcut: "e" }),
  ids: t.switchOption(),
  regex: t.switchOption({ shortcut: "re" }),
  "status-search": t.switchOption({ shortcut: "ss" }),
};

export const SearchCmd = utilityCmd({
  trigger: ["search", "s"],
  description: "Search server members",
  usage: "!search dragory",
  permission: "can_search",

  signature: searchCmdSignature,

  run({ pluginData, message, args }) {
    if (args.export) {
      return archiveSearch(pluginData, args, SearchType.MemberSearch, message);
    } else {
      return displaySearch(pluginData, args, SearchType.MemberSearch, message);
    }
  },
});
