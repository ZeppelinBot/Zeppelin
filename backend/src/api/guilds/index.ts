import express from "express";
import { apiTokenAuthHandlers } from "../auth";
import { initGuildsImportExportAPI } from "./importExport";
import { initGuildsMiscAPI } from "./misc";

export function initGuildsAPI(app: express.Express) {
  const guildRouter = express.Router();
  guildRouter.use(...apiTokenAuthHandlers());

  initGuildsMiscAPI(guildRouter);
  initGuildsImportExportAPI(guildRouter);

  app.use("/guilds", guildRouter);
}
