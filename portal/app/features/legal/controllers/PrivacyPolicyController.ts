import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import app from "@adonisjs/core/services/app";
import type { HttpContext } from "@adonisjs/core/http";
import { portalEnv } from "#start/env";

export default class PrivacyPolicyController {
  async getPrivacyPolicyPage({ inertia }: HttpContext) {
    let markdown = "No privacy policy configured. Please contact the site administrator.";
    const configuredPath = portalEnv.get("PORTAL_PRIVACY_POLICY_PATH");
    if (configuredPath) {
      const filePath = isAbsolute(configuredPath) ? configuredPath : app.makePath(configuredPath);
      markdown = await readFile(filePath, "utf8");
    }

    return inertia.render("features/legal/pages/PrivacyPolicyPage", {
      privacyPolicyMd: markdown,
    });
  }
}
