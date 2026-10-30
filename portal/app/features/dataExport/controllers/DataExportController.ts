import { deleteDataExport, refreshDataExportStatus } from "#backend/features/dataExport/dataExports";
import PortalDataExport from "#backend/features/dataExport/models/PortalDataExport";
import { isStaff } from "#backend/isStaff";
import type { HttpContext } from "@adonisjs/core/http";

export default class DataExportController {
  private async findExport({ params, auth, response }: HttpContext) {
    response.header("Cache-Control", "no-store");
    const job = await PortalDataExport.findBy("code", params.code);
    const userId = auth.user!.discordUserId;
    if (!job || (job.ref !== `user-${userId}` && !isStaff(userId))) {
      response.notFound({ message: "Data export not found" });
      return null;
    }
    return job;
  }

  async getStatus(ctx: HttpContext) {
    const job = await this.findExport(ctx);
    if (!job) {
      return;
    }
    await refreshDataExportStatus(job);
    return ctx.response.ok({ status: job.status });
  }

  async getDownload(ctx: HttpContext) {
    const job = await this.findExport(ctx);
    if (!job) {
      return;
    }
    await refreshDataExportStatus(job);
    if (job.status !== "completed" || !job.filePath) {
      return ctx.response.conflict({ message: "Data export is not ready" });
    }
    // The browser acknowledges a fully received download with DELETE. Keep the
    // file here so an interrupted transfer can be retried.
    ctx.response.attachment(job.filePath, `export-${job.ref}.zip`, "attachment", false);
  }

  async deleteExport(ctx: HttpContext) {
    const job = await this.findExport(ctx);
    if (!job) {
      return;
    }
    if (job.status === "processing") {
      return ctx.response.conflict({ message: "Data export is still processing" });
    }
    await deleteDataExport(job);
    return ctx.response.noContent();
  }
}
