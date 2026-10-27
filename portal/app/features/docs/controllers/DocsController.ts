import type { HttpContext } from "@adonisjs/core/http";

export default class DocsController {
  async getIndex({ inertia }: HttpContext) {
    return inertia.render("features/docs/pages/DocsIndex", {});
  }
}
