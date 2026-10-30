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
import { dataDeleteThrottle, dataDownloadThrottle } from "#start/limiter";
import router from "@adonisjs/core/services/router";

router.get("/", [controllers.splash.Splash, "getIndex"]);

router.get("/privacy-policy", [controllers.legal.PrivacyPolicy, "getPrivacyPolicyPage"]);

router
  .group(() => {
    router.get("/", [controllers.docs.Docs, "getIndex"]);
  })
  .prefix("/docs")
  .use(({ inertia }, next) => {
    inertia.share({
      docsLayoutData,
    });
    return next();
  });

router
  .group(() => {
    router.get("/oauth/discord/login", [controllers.auth.Auth, "getDiscordLogin"]);
    router.get("/oauth/discord/callback", [controllers.auth.Auth, "getDiscordCallback"]);
  })
  .middleware(middleware.guest());

router.post("/logout", [controllers.auth.Auth, "postLogout"]);

router
  .group(() => {
    router.get("/data-exports/:code", [controllers.dataExport.DataExport, "getStatus"]);
    router.get("/data-exports/:code/download", [controllers.dataExport.DataExport, "getDownload"]);
    router.delete("/data-exports/:code", [controllers.dataExport.DataExport, "deleteExport"]);

    router.get("/account", [controllers.account.Account, "getMyAccountPage"]);
    router
      .post("/account/download-data", [controllers.account.Account, "postDownloadMyAccountData"])
      .use(dataDownloadThrottle);
    router
      .post("/account/delete-data", [controllers.account.Account, "postDeleteMyAccountData"])
      .use(dataDeleteThrottle);

    router
      .group(() => {
        router
          .get("/specific-account/:userId", [controllers.account.Account, "getSpecificAccountPage"])
          .where("userId", { match: /^\d+$/ });
        router
          .post("/specific-account/:userId/download-data", [
            controllers.account.Account,
            "postDownloadSpecificAccountData",
          ])
          .where("userId", { match: /^\d+$/ });
        router
          .post("/specific-account/:userId/delete-data", [controllers.account.Account, "postDeleteSpecificAccountData"])
          .where("userId", { match: /^\d+$/ });
      })
      .middleware(middleware.isStaff());
  })
  .middleware(middleware.authPage());
