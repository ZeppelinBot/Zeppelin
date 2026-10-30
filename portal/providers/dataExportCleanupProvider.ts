import { cleanupExpiredDataExports } from "#backend/features/dataExport/dataExports";
import logger from "@adonisjs/core/services/logger";

export default class DataExportCleanupProvider {
  private interval?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  private cleanup() {
    // A slow database or filesystem must not cause overlapping sweeps.
    this.running ??= cleanupExpiredDataExports()
      .catch((error) => {
        logger.error({ err: error }, "Failed to clean up expired data exports");
      })
      .finally(() => {
        this.running = undefined;
      });
    return this.running;
  }

  async ready() {
    await this.cleanup();
    this.interval = setInterval(() => {
      void this.cleanup();
    }, 60_000);
    this.interval.unref();
  }

  async shutdown() {
    clearInterval(this.interval);
    await this.running;
  }
}
