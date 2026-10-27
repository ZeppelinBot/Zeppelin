/**
 * A serializable version of ZeppelinPluginDocs
 */
export interface ZeppelinPluginDocsData {
  name: string;
  prettyName: string;
  type: "stable" | "legacy" | "internal";
  description?: string;
  usageGuide?: string;
  configurationGuide?: string;
  configJsonSchema: any;
}

export interface ZeppelinDocsData {
  guildPlugins: ZeppelinPluginDocsData[];
  globalPlugins: ZeppelinPluginDocsData[];
}
