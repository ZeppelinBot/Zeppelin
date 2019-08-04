import { clientError, error, notFound } from "./responses";
import express from "express";
import cors from "cors";
import { initAuth } from "./auth";
import { initGuildsAPI } from "./guilds";
import { initArchives } from "./archives";
import { connect } from "../data/db";
import path from "path";
import { TokenError } from "passport-oauth2";
import { PluginError } from "knub";

require("dotenv").config({ path: path.resolve(__dirname, "..", "..", "api.env") });

function errorHandler(err) {
  // tslint:disable:no-console
  console.error(err.stack || err);
  process.exit(1);
  // tslint:enable:no-console
}

process.on("unhandledRejection", errorHandler);

console.log("Connecting to database...");
connect().then(() => {
  const app = express();

  app.use(
    cors({
      origin: process.env.DASHBOARD_URL,
    }),
  );
  app.use(express.json());

  initAuth(app);
  initGuildsAPI(app);
  initArchives(app);

  // Default route
  app.get("/", (req, res) => {
    res.json({ status: "cookies", with: "milk" });
  });

  // Error response
  app.use((err, req, res, next) => {
    if (err instanceof TokenError) {
      clientError(res, "Invalid code");
    } else {
      console.error(err);
      error(res, "Server error", err.status || 500);
    }
  });

  // 404 response
  app.use((req, res, next) => {
    return notFound(res);
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API server listening on port ${port}`));
});
