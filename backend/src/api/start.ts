import { clientError, error, notFound } from "./responses";
import express from "express";
import cors from "cors";
import { initAuth } from "./auth";
import { initGuildsAPI } from "./guilds";
import { initArchives } from "./archives";
import { initDocs } from "./docs";
import { TokenError } from "passport-oauth2";

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
initDocs(app);

// Default route
app.get("/", (req, res) => {
  res.json({ status: "cookies", with: "milk" });
});

// Error response
app.use((err, req, res, next) => {
  if (err instanceof TokenError) {
    clientError(res, "Invalid code");
  } else {
    console.error(err); // tslint:disable-line
    error(res, "Server error", err.status || 500);
  }
});

// 404 response
app.use((req, res, next) => {
  return notFound(res);
});

const port = (process.env.PORT && parseInt(process.env.PORT, 10)) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`API server listening on port ${port}`)); // tslint:disable-line
