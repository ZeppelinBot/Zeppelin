require("dotenv").config();

import express from "express";
import cors from "cors";
import { initAuth } from "./auth";
import { initGuildsAPI } from "./guilds";
import { connect } from "../data/db";

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

  app.get("/", (req, res) => {
    res.end({ status: "cookies" });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API server listening on port ${port}`));
});
