import PortalUser from "#backend/features/auth/models/PortalUser";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from 'luxon';

export default class AuthController {
  async getDiscordLogin({ ally, session }: HttpContext) {
    // Return URL on failed login
    session.put("redirect.previousUrl", "/");
    return ally.use("discord").redirect();
  }

  async getDiscordCallback({ ally, auth, response }: HttpContext) {
    const discordUser = await ally.use("discord").user();

    const user = await navigator.locks.request(`login-callback-${discordUser.id}`, async () => {
      const existingUser = await PortalUser.query()
        .where("userId", discordUser.id)
        .first();
      
      if (existingUser) {
        existingUser.username = discordUser.name;
        existingUser.avatar = discordUser.avatarUrl;
        existingUser.lastLoginAt = DateTime.now();
        return existingUser.save();
      }

      const newUser = new PortalUser();
      newUser.userId = discordUser.id;
      newUser.username = discordUser.name;
      newUser.avatar = discordUser.avatarUrl;
      newUser.lastLoginAt = DateTime.now();
      return newUser.save();
    });

    await auth.use("web").login(user);

    return response.redirect().toIntended("/account");
  }

  async postLogout({ auth, session, inertia, response }: HttpContext) {
    if (!auth.user) {
      session.flash("success", "You are not logged in");
      return response.redirect("/");
    }

    await auth.use("web").logout();

    session.regenerate();
    session.flash("success", "You have been logged out");

    inertia.clearHistory();
    return response.redirect("/");
  }
}
