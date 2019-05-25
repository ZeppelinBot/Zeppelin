import express from "express";
import passport from "passport";
import OAuth2Strategy from "passport-oauth2";
import CustomStrategy from "passport-custom";
import { DashboardLogins, DashboardLoginUserData } from "../../data/DashboardLogins";
import pick from "lodash.pick";
import https from "https";

const DISCORD_API_URL = "https://discordapp.com/api";

function simpleAPIRequest(bearerToken, path): Promise<any> {
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

export default function initAuth(app: express.Express) {
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

  const dashboardLogins = new DashboardLogins();

  // Initialize API tokens
  passport.use(
    "api-token",
    new CustomStrategy(async (req, cb) => {
      console.log("in api-token strategy");
      const apiKey = req.header("X-Api-Key");
      if (!apiKey) return cb();

      const userId = await dashboardLogins.getUserIdByApiKey(apiKey);
      if (userId) {
        cb(null, { userId });
      }

      cb();
    }),
  );

  // Initialize OAuth2 for Discord login
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
        const user = await simpleAPIRequest(accessToken, "users/@me");
        const userData = pick(user, ["username", "discriminator", "avatar"]) as DashboardLoginUserData;
        const apiKey = await dashboardLogins.addLogin(user.id, userData);
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
      res.redirect(`${process.env.DASHBOARD_URL}/login-callback/?apiKey=${req.user.apiKey}`);
    },
  );
}
