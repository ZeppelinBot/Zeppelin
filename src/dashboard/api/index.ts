require("dotenv").config();

import express from "express";
import initAuth from "./auth";
import { connect } from "../../data/db";

console.log("Connecting to database...");
connect().then(() => {
  const app = express();

  initAuth(app);

  app.get("/", (req, res) => {
    res.end("Hi");
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API server listening on port ${port}`));
});
