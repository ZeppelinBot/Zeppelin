import express, { Request, Response } from "express";
import passport from "passport";
import OAuth2Strategy from "passport-oauth2";
import CustomStrategy from "passport-custom";
import { ApiLogins } from "../data/ApiLogins";
import pick from "lodash.pick";
import https from "https";
import { ApiUserInfo } from "../data/ApiUserInfo";
import { ApiUserInfoData } from "../data/entities/ApiUserInfo";
import { ApiPermissions } from "../data/ApiPermissions";
import { ok } from "./responses";

const DISCORD_API_URL = "https://discordapp.com/api";

function simpleDiscordAPIRequest(bearerToken, path): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      `${DISCORD_API_URL}/${path}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
      res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Discord API error ${res.statusCode}`));
          return;
        }

        res.on("data", data => resolve(JSON.parse(data)));
      },
    );

    request.on("error", err => reject(err));
  });
}

export function initAuth(app: express.Express) {
  app.use(passport.initialize());

  if (!process.env.CLIENT_ID) {
    throw new Error("Auth: CLIENT ID missing");
  }

  if (!process.env.CLIENT_SECRET) {
    throw new Error("Auth: CLIENT SECRET missing");
  }

  if (!process.env.OAUTH_CALLBACK_URL) {
    throw new Error("Auth: OAUTH CALLBACK URL missing");
  }

  if (!process.env.DASHBOARD_URL) {
    throw new Error("DASHBOARD_URL missing!");
  }

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  const apiLogins = new ApiLogins();
  const apiUserInfo = new ApiUserInfo();
  const apiPermissions = new ApiPermissions();

  // Initialize API tokens
  passport.use(
    "api-token",
    new CustomStrategy(async (req, cb) => {
      const apiKey = req.header("X-Api-Key");
      if (!apiKey) return cb();

      const userId = await apiLogins.getUserIdByApiKey(apiKey);
      if (userId) {
        return cb(null, { apiKey, userId });
      }

      cb();
    }),
  );

  // Initialize OAuth2 for Discord login
  // When the user logs in through OAuth2, we create them a "login" (= api token) and update their user info in the DB
  passport.use(
    new OAuth2Strategy(
      {
        authorizationURL: "https://discordapp.com/api/oauth2/authorize",
        tokenURL: "https://discordapp.com/api/oauth2/token",
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.OAUTH_CALLBACK_URL,
        scope: ["identify"],
      },
      async (accessToken, refreshToken, profile, cb) => {
        const user = await simpleDiscordAPIRequest(accessToken, "users/@me");

        // Make sure the user is able to access at least 1 guild
        const permissions = await apiPermissions.getByUserId(user.id);
        if (permissions.length === 0) {
          cb(null, {});
          return;
        }

        // Generate API key
        const apiKey = await apiLogins.addLogin(user.id);
        const userData = pick(user, ["username", "discriminator", "avatar"]) as ApiUserInfoData;
        await apiUserInfo.update(user.id, userData);
        // TODO: Revoke access token, we don't need it anymore
        cb(null, { apiKey });
      },
    ),
  );

  app.get("/auth/login", passport.authenticate("oauth2"));
  app.get(
    "/auth/oauth-callback",
    passport.authenticate("oauth2", { failureRedirect: "/", session: false }),
    (req, res) => {
      if (req.user && req.user.apiKey) {
        res.redirect(`${process.env.DASHBOARD_URL}/login-callback/?apiKey=${req.user.apiKey}`);
      } else {
        res.redirect(`${process.env.DASHBOARD_URL}/login-callback/?error=noaccess`);
      }
    },
  );
  app.post("/auth/validate-key", async (req: Request, res: Response) => {
    const key = req.body.key;
    if (!key) {
      return res.status(400).json({ error: "No key supplied" });
    }

    const userId = await apiLogins.getUserIdByApiKey(key);
    if (!userId) {
      return res.json({ valid: false });
    }

    res.json({ valid: true });
  });
  app.post("/auth/logout", ...getRequireAPITokenHandlers(), async (req: Request, res: Response) => {
    await apiLogins.expireApiKey(req.user.apiKey);
    return ok(res);
  });
}

function getRequireAPITokenHandlers() {
  return [
    passport.authenticate("api-token", { failWithError: true }),
    (err, req, res, next) => {
      return res.json({ error: err.message });
    },
  ];
}

export function requireAPIToken(router: express.Router) {
  router.use(...getRequireAPITokenHandlers());
}
