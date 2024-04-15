import express from "express";
import { apiTokenAuthHandlers } from "../auth";
import { initGuildsImportExportAPI } from "./importExport";
import { initGuildsMiscAPI } from "./misc";

export function initGuildsAPI(router: express.Router) {
  const guildRouter = express.Router();
  guildRouter.use(...apiTokenAuthHandlers());

  initGuildsMiscAPI(guildRouter);
  initGuildsImportExportAPI(guildRouter);

  router.use("/guilds", guildRouter);
}
