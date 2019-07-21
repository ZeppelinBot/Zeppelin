import { error, notFound } from "./responses";
import express from "express";
import cors from "cors";
import { initAuth } from "./auth";
import { initGuildsAPI } from "./guilds";
import { initArchives } from "./archives";
import { connect } from "../data/db";
import path from "path";

require("dotenv").config({ path: path.resolve(__dirname, "..", "..", "api.env") });

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
    res.end({ status: "cookies" });
  });

  // Error response
  app.use((err, req, res, next) => {
    error(res, err.message, err.status || 500);
  });

  // 404 response
  app.use((req, res, next) => {
    return notFound(res);
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API server listening on port ${port}`));
});
