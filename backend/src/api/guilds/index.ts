import express from "express";
import { apiTokenAuthHandlers } from "../auth";
import { initGuildsMiscAPI } from "./misc";
import { initGuildsImportExportAPI } from "./importExport";

export function initGuildsAPI(app: express.Express) {
  const guildRouter = express.Router();
  guildRouter.use(...apiTokenAuthHandlers());

  initGuildsMiscAPI(guildRouter);
  initGuildsImportExportAPI(guildRouter);

  app.use("/guilds", guildRouter);
}
