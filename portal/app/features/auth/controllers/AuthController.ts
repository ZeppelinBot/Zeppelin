import PortalUser from "#backend/features/auth/models/PortalUser";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

function normalizeUsername(username: string) {
  return username.match(/^(.+)(#.*)?$/)![1];
}

export default class AuthController {
  async getDiscordLogin({ ally, session }: HttpContext) {
    // Return URL on failed login
    session.put("redirect.previousUrl", "/");
    return ally.use("discord").redirect();
  }

  async getDiscordCallback({ ally, auth, response }: HttpContext) {
    const discordUser = await ally.use("discord").user();

    const user = await navigator.locks.request(`login-callback-${discordUser.id}`, async () => {
      const existingUser = await PortalUser.query().where("discord_user_id", discordUser.id).first();

      if (existingUser) {
        existingUser.discordUsername = normalizeUsername(discordUser.name);
        existingUser.discordAvatarUrl = discordUser.avatarUrl;
        existingUser.lastLoginAt = DateTime.now();
        return existingUser.save();
      }

      const newUser = new PortalUser();
      newUser.discordUserId = discordUser.id;
      newUser.discordUsername = normalizeUsername(discordUser.name);
      newUser.discordAvatarUrl = discordUser.avatarUrl;
      newUser.lastLoginAt = DateTime.now();
      return newUser.save();
    });

    await auth.use("web").login(user);

    return response.redirect().withQs(false).toIntended("/account");
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
