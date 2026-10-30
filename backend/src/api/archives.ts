import express, { Request, Response } from "express";
import moment from "moment-timezone";
import { GuildPluginData, PluginConfigManager } from "vety";
import { Configs } from "../data/Configs.js";
import { GuildArchives } from "../data/GuildArchives.js";
import { TimeAndDatePluginType, zTimeAndDateConfig } from "../plugins/TimeAndDate/types.js";
import { zZeppelinGuildConfig } from "../types.js";
import { loadYamlSafely } from "../utils/loadYamlSafely.js";
import { notFound } from "./responses.js";

const defaultTimeAndDateConfig = zTimeAndDateConfig.parse({});

async function getTimeAndDateConfigForGuild(guildId: string, configs: Configs) {
  try {
    const configEntry = await configs.getActiveByKey(`guild-${guildId}`);
    if (!configEntry?.config) {
      return defaultTimeAndDateConfig;
    }

    const parsedConfig = loadYamlSafely(configEntry.config);
    const guildConfig = zZeppelinGuildConfig.safeParse(parsedConfig);
    if (!guildConfig.success) {
      return defaultTimeAndDateConfig;
    }

    const pluginOptions = guildConfig.data.plugins?.time_and_date;
    if (!pluginOptions) {
      return defaultTimeAndDateConfig;
    }

    const configManager = new PluginConfigManager<GuildPluginData<TimeAndDatePluginType>>(pluginOptions, {
      configSchema: zTimeAndDateConfig,
      defaultOverrides: [],
      levels: guildConfig.data.levels ?? {},
    });
    await configManager.init();

    return configManager.get();
  } catch (err) {
    console.error(`Failed to load time and date config for guild ${guildId}`, err);
    return defaultTimeAndDateConfig;
  }
}

export function initArchives(router: express.Router) {
  const archives = new GuildArchives(null);
  const configs = new Configs();

  // Legacy redirect
  router.get("/spam-logs/:id", (req: Request, res: Response) => {
    res.redirect("/archives/" + req.params.id);
  });

  router.get("/archives/:id", async (req: Request, res: Response) => {
    const archive = await archives.find(req.params.id);
    if (!archive) return notFound(res);

    let body = archive.body;

    // Add some metadata at the end of the log file (but only if it doesn't already have it directly in the body)
    if (archive.body.indexOf("Log file generated on") === -1) {
      const timeAndDateConfig = await getTimeAndDateConfigForGuild(archive.guild_id, configs);
      const prettyDatetimeFormat = timeAndDateConfig.date_formats.pretty_datetime;

      const createdAt = moment.utc(archive.created_at).tz(timeAndDateConfig.timezone).format(prettyDatetimeFormat);
      body += `\n\nLog file generated on ${createdAt}`;

      if (archive.expires_at !== null) {
        const expiresAt = moment.utc(archive.expires_at).tz(timeAndDateConfig.timezone).format(prettyDatetimeFormat);
        body += `\nExpires at ${expiresAt}`;
      }
    }

    res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(body);
  });
}
