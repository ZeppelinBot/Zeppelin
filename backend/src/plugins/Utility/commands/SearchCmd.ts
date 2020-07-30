import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { archiveSearch, displaySearch, SearchType } from "../search";

// Separate from SearchCmd to avoid a circular reference from ./search.ts
export const searchCmdSignature = {
  query: ct.string({ catchAll: true, required: false }),

  page: ct.number({ option: true, shortcut: "p" }),
  role: ct.string({ option: true, shortcut: "r" }),
  voice: ct.switchOption({ shortcut: "v" }),
  bot: ct.switchOption({ shortcut: "b" }),
  sort: ct.string({ option: true }),
  "case-sensitive": ct.switchOption({ shortcut: "cs" }),
  export: ct.switchOption({ shortcut: "e" }),
  ids: ct.switchOption(),
  regex: ct.switchOption({ shortcut: "re" }),
  "status-search": ct.switchOption({ shortcut: "ss" }),
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
