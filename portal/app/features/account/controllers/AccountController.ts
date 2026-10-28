import type { HttpContext } from "@adonisjs/core/http";

export default class AccountController {
  async getAccountPage({ inertia }: HttpContext) {
    return inertia.render("features/account/pages/AccountPage", {});
  }

  async postDownloadAccountData({ response }: HttpContext) {
    return { foo: "bar" };
  }

  async postDeleteAccountData({ response }: HttpContext) {
    return response.redirect("/");
  }
}
