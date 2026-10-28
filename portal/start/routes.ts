/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { docsLayoutData } from "#backend/features/docs/utils/docsLayoutData";
import { controllers } from "#generated/controllers";
import { middleware } from "#start/kernel";
import router from "@adonisjs/core/services/router";

router.get("/", [controllers.splash.Splash, "getIndex"]);

router.group(() => {
  router.get("/", [controllers.docs.Docs, "getIndex"]);
}).prefix("/docs").use(({ inertia }, next) => {
  inertia.share({
    docsLayoutData,
  });
  return next();
});

router.group(() => {
  router.get("/oauth/discord/login", [controllers.auth.Auth, "getDiscordLogin"]);
  router.get("/oauth/discord/callback", [controllers.auth.Auth, "getDiscordCallback"]);
}).middleware(middleware.guest());

router.post("/logout", [controllers.auth.Auth, "postLogout"]);

router.group(() => {
  router.get("/account", [controllers.account.Account, "getAccountPage"]);
  router.post("/account/download-data", [controllers.account.Account, "postDownloadAccountData"]);
  router.post("/account/delete-data", [controllers.account.Account, "postDeleteAccountData"]);
}).middleware(middleware.authPage());
