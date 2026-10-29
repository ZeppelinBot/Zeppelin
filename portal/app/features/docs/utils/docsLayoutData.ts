import { MenuCategory } from "#backend/features/menu/types";
import { docsData } from "@zeppelinbot/shared/docsData.js";

const sortedGuildPlugins = docsData.guildPlugins.toSorted((a, b) => {
  if (a.prettyName.toLowerCase() > b.prettyName.toLowerCase()) return 1;
  if (a.prettyName.toLowerCase() < b.prettyName.toLowerCase()) return 1;
  return 0;
});

const menu: MenuCategory[] = [
  {
    title: "General",
    items: [
      {
        label: "Introduction",
        path: "/docs",
      },
    ],
  },
  {
    title: "Plugins",
    items: sortedGuildPlugins
      .filter((p) => p.type === "stable")
      .map((p) => ({
        label: p.prettyName,
        path: `/docs/plugins/${p.name}`,
      })),
  },
  {
    title: "Legacy plugins",
    items: sortedGuildPlugins
      .filter((p) => p.type === "legacy")
      .map((p) => ({
        label: p.prettyName,
        path: `/docs/plugins/${p.name}`,
      })),
  },
];

export const docsLayoutData = {
  menu,
};

export type DocsLayoutData = typeof docsLayoutData;
