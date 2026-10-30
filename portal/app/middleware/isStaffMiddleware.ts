import { isStaff } from "#backend/isStaff";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class IsStaffMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.getUserOrFail();

    if (!isStaff(user.discordUserId)) {
      return response.forbidden("Access denied");
    }

    return next();
  }
}
