import cors from "cors";
import express from "express";
import multer from "multer";
import { TokenError } from "passport-oauth2";
import { env } from "../env";
import { initArchives } from "./archives";
import { initAuth } from "./auth";
import { initDocs } from "./docs";
import { initGuildsAPI } from "./guilds/index";
import { clientError, error, notFound } from "./responses";
import { startBackgroundTasks } from "./tasks";

const apiPathPrefix = env.API_PATH_PREFIX || (env.NODE_ENV === "development" ? "/api" : "");

const app = express();

app.use(
  cors({
    origin: env.DASHBOARD_URL,
  }),
);
app.use(
  express.json({
    limit: "50mb",
  }),
);
app.use(multer().none());

const rootRouter = express.Router();

initAuth(rootRouter);
initGuildsAPI(rootRouter);
initArchives(rootRouter);
initDocs(rootRouter);

// Default route
rootRouter.get("/", (req, res) => {
  res.json({ status: "cookies", with: "milk" });
});

app.use(apiPathPrefix, rootRouter);

// Error response
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof TokenError) {
    clientError(res, "Invalid code");
  } else {
    console.error(err); // tslint:disable-line
    error(res, "Server error", err.status || 500);
  }
});

// 404 response
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((req, res, next) => {
  return notFound(res);
});

const port = 3001;
app.listen(port, "0.0.0.0", () => console.log(`API server listening on port ${port}`)); // tslint:disable-line

startBackgroundTasks();
