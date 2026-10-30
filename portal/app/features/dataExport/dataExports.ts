import PortalDataExport from "#backend/features/dataExport/models/PortalDataExport";
import logger from "@adonisjs/core/services/logger";
import { DateTime } from "luxon";
import { randomBytes } from "node:crypto";
import { access, mkdtemp, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const processingTimeoutMs = 15 * 60 * 1000;

export async function cleanupExpiredDataExports() {
  const exports = await PortalDataExport.query()
    .whereIn("status", ["completed", "failed"])
    .where("completedAt", "<=", DateTime.utc().minus({ minutes: 10 }).toJSDate())
    .exec();
  for (const job of exports) {
    try {
      await deleteDataExport(job);
    } catch (error) {
      logger.error({ err: error, dataExportId: job.id }, "Failed to clean up data export");
    }
  }
}

type ExportUpdate = { status: "completed" | "failed"; completedAt: DateTime; filePath?: string | null };

async function updateDataExport(job: PortalDataExport, expectedStatus: string, values: ExportUpdate) {
  const [affected] = await PortalDataExport.query()
    .where("id", job.id)
    .where("status", expectedStatus)
    .update({ ...values, completedAt: values.completedAt.toJSDate() });
  if (affected) {
    job.merge(values);
  }
  return Boolean(affected);
}

export async function refreshDataExportStatus(job: PortalDataExport) {
  // A portal restart can interrupt an in-process job. Unless it's timed out, we can retry it.
  let failed = job.status === "processing" && Date.now() - job.createdAt.toMillis() > processingTimeoutMs;
  if (job.status === "completed") {
    if (!job.filePath) {
      failed = true;
    } else {
      try {
        await access(job.filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        failed = true;
      }
    }
  }
  if (failed) {
    const updated = await updateDataExport(job, job.status, { status: "failed", completedAt: DateTime.utc() });
    if (!updated) {
      const current = await PortalDataExport.findBy("code", job.code);
      if (current) {
        job.merge({ status: current.status, filePath: current.filePath, completedAt: current.completedAt });
      }
    }
  }
}

async function removeDataExportFile(filePath: string | null) {
  if (filePath) {
    await rm(filePath, { force: true });
    const directory = dirname(filePath);
    if (dirname(directory) === tmpdir() && basename(directory).startsWith("zeppelin-data-export-")) {
      try {
        await rmdir(directory);
      } catch (error) {
        if (!["ENOENT", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) {
          throw error;
        }
      }
    }
  }
}

export async function deleteDataExport(job: PortalDataExport) {
  try {
    // Read the latest file path under a lock so completion and deletion cannot
    // race to leave a ZIP without a database row.
    await job.lockForUpdate(async (current) => {
      await removeDataExportFile(current.filePath);
      await current.delete();
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "E_MODEL_DELETED") {
      throw error;
    }
  }
}

export async function startDataExport(
  ref: string,
  requesterId: number,
  build: () => Promise<Buffer>,
): Promise<PortalDataExport> {
  const existing = await PortalDataExport.query().where("ref", ref).where("requesterId", requesterId).first();
  if (existing) {
    await refreshDataExportStatus(existing);
    if (existing.status !== "failed") {
      return existing;
    }
    await deleteDataExport(existing);
  }

  let job: PortalDataExport;
  try {
    job = await PortalDataExport.create({
      ref,
      requesterId,
      code: randomBytes(32).toString("hex"),
      status: "processing",
      filePath: null,
      completedAt: null,
    });
  } catch (error) {
    // The unique (ref, requester_id) pair prevents duplicate work from concurrent requests.
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      const concurrent = await PortalDataExport.query().where("ref", ref).where("requesterId", requesterId).first();
      if (concurrent) {
        return concurrent;
      }
    }
    throw error;
  }

  setImmediate(() => {
    void buildDataExport(job, build).catch((error) => {
      logger.error({ err: error, dataExportId: job.id }, "Failed to update data export job");
    });
  });
  return job;
}

async function buildDataExport(job: PortalDataExport, build: () => Promise<Buffer>) {
  let directory: string | undefined;
  try {
    const buffer = await build();
    const current = await PortalDataExport.findBy("code", job.code);
    if (!current || current.status !== "processing") {
      return;
    }

    // mkdtemp creates a private directory and avoids collisions between jobs.
    directory = await mkdtemp(join(tmpdir(), "zeppelin-data-export-"));
    const filePath = join(directory, "export.zip");
    await writeFile(filePath, buffer, { mode: 0o600, flag: "wx" });
    const published = await updateDataExport(job, "processing", {
      filePath,
      status: "completed",
      completedAt: DateTime.utc(),
    });
    if (!published) {
      await rm(directory, { recursive: true, force: true });
    }
  } catch (error) {
    logger.error({ err: error, dataExportId: job.id }, "Failed to build data export");
    if (directory) {
      await rm(directory, { recursive: true, force: true });
    }
    await updateDataExport(job, "processing", { filePath: null, status: "failed", completedAt: DateTime.utc() });
  }
}
