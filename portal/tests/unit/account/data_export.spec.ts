import { accountDataCategories } from "#backend/features/account/accountDataDefinitions";
import AccountController from "#backend/features/account/controllers/AccountController";
import AuthPageMiddleware from "#backend/features/auth/middleware/authPageMiddleware";
import DataExportController from "#backend/features/dataExport/controllers/DataExportController";
import * as dataExports from "#backend/features/dataExport/dataExports";
import { dataDownloadThrottle } from "#start/limiter";
import PortalDataExport from "#backend/features/dataExport/models/PortalDataExport";
import logger from "@adonisjs/core/services/logger";
import type { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";
import { HttpContextFactory } from "@adonisjs/core/factories/http";
import { test } from "@japa/runner";
import JSZip from "jszip";
import { DateTime } from "luxon";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { mock } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

function context(userId = "1234", portalUserId = 1) {
  const ctx = new HttpContextFactory().create();
  Object.defineProperty(ctx, "auth", { value: { user: { id: portalUserId, discordUserId: userId } } });
  return ctx;
}

test.group("Account data exports", (group) => {
  let rows: PortalDataExport[];
  let beforeUpdate: ((values: Record<string, unknown>) => void) | undefined;
  const originalCategories = [...accountDataCategories];

  group.each.setup((testCase) => {
    rows = [];
    beforeUpdate = undefined;
    mock.method(logger, "error", () => {});
    accountDataCategories.splice(0);
    mock.method(PortalDataExport, "findBy", async (key: keyof PortalDataExport, value: unknown) => {
      return rows.find((row) => row[key] === value) ?? null;
    });
    mock.method(PortalDataExport, "create", async (values: Partial<PortalDataExport>) => {
      const row = new PortalDataExport();
      row.fill({ ...values, id: rows.length + 1, createdAt: DateTime.utc() });
      mock.method(row, "save", async () => row);
      mock.method(row, "lockForUpdate", async (callback: (locked: PortalDataExport) => unknown) => callback(row));
      mock.method(row, "delete", async () => {
        rows = rows.filter((item) => item !== row);
      });
      rows.push(row);
      return row;
    });
    mock.method(PortalDataExport, "query", () => {
      const filters: Array<(row: PortalDataExport) => boolean> = [];
      const matches = () => rows.filter((row) => filters.every((filter) => filter(row)));
      const query = {
        where(key: keyof PortalDataExport, operator: unknown, value?: unknown) {
          if (value === undefined) {
            filters.push((row) => row[key] === operator);
          } else if (operator === "<=") {
            filters.push((row) => row[key] != null && Number(row[key]) <= Number(value));
          } else {
            throw new Error(`Unsupported query operator: ${operator}`);
          }
          return query;
        },
        whereIn(key: keyof PortalDataExport, values: unknown[]) {
          filters.push((row) => values.includes(row[key]));
          return query;
        },
        async first() {
          return matches()[0] ?? null;
        },
        async exec() {
          return matches();
        },
        async update(values: Record<string, unknown>) {
          beforeUpdate?.(values);
          const selected = matches();
          for (const row of selected) {
            row.merge({ ...values, completedAt: DateTime.fromJSDate(values.completedAt as Date) });
          }
          return [selected.length];
        },
      };
      return query;
    });
    testCase.cleanup(async () => {
      for (const row of rows) {
        if (row.filePath) {
          await rm(dirname(row.filePath), { recursive: true, force: true });
        }
      }
      accountDataCategories.splice(0, accountDataCategories.length, ...originalCategories);
      mock.restoreAll();
    });
  });

  function addCategory(getData: () => Promise<{ columns: string[]; rows: Record<string, string>[] }>) {
    accountDataCategories.push({
      name: "test_data",
      prettyName: "Test data",
      controller: "zeppelin",
      userSelfServeTools: { getData },
      serverSelfServeTools: {},
    });
  }

  async function waitForExport(row: PortalDataExport) {
    for (let attempt = 0; attempt < 100 && row.status === "processing"; attempt++) {
      await delay(5);
    }
  }

  test("returns a job code before collection finishes and writes the ZIP in the background", async ({ assert }) => {
    const data = Promise.withResolvers<{ columns: string[]; rows: Record<string, string>[] }>();
    addCategory(() => data.promise);
    const ctx = context();
    const request = new AccountController().postDownloadMyAccountData(ctx);
    const returned = await Promise.race([request.then(() => true), delay(50).then(() => false)]);
    // Release the collection even if the assertion fails.
    data.resolve({ columns: ["value"], rows: [{ value: "hello" }] });
    assert.isTrue(returned, "The HTTP request must return while data collection is still pending");
    assert.equal(ctx.response.response.statusCode, 202);
    const payload = ctx.response.content?.[0];
    assert.match(payload.code, /^[a-f0-9]{64}$/);
    assert.equal(rows[0].ref, "user-1234");
    assert.equal(rows[0].requesterId, 1);
    assert.equal(rows[0].completedAt, null);
    await waitForExport(rows[0]);
    assert.equal(rows[0].status, "completed");
    assert.isNotNull(rows[0].completedAt);
    assert.match(rows[0].filePath!, /^\/tmp\/zeppelin-data-export-/);
    const zip = await JSZip.loadAsync(await readFile(rows[0].filePath!));
    assert.equal(await zip.file("test_data.csv")!.async("string"), "value\nhello\n");
  });

  test("reuses an existing export for the same subject and requester", async ({ assert }) => {
    const data = Promise.withResolvers<{ columns: string[]; rows: Record<string, string>[] }>();
    addCategory(() => data.promise);
    const controller = new AccountController();
    const first = context();
    const second = context();
    const started = controller.postDownloadMyAccountData(first);
    // Keep this test bounded against the old synchronous controller.
    await Promise.race([started, delay(50)]);
    data.resolve({ columns: ["value"], rows: [] });
    await started;
    await controller.postDownloadMyAccountData(second);
    assert.lengthOf(rows, 1);
    assert.equal(first.response.content?.[0].code, second.response.content?.[0].code);
    await waitForExport(rows[0]);
  });

  test("builds separate archives for each requesting portal user", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    const controller = new AccountController();
    const first = context("5678", 7);
    first.params = { userId: "1234" };
    await controller.postDownloadSpecificAccountData(first);
    await waitForExport(rows[0]);
    const second = context("5678", 8);
    second.params = { userId: "1234" };
    await controller.postDownloadSpecificAccountData(second);
    await waitForExport(rows.at(-1)!);
    assert.lengthOf(rows, 2);
    assert.notEqual(first.response.content?.[0].code, second.response.content?.[0].code);
    assert.deepEqual(
      rows.map((row) => ({ ref: row.ref, requesterId: row.requesterId })),
      [
        { ref: "user-1234", requesterId: 7 },
        { ref: "user-1234", requesterId: 8 },
      ],
    );
    const repeated = context("5678", 7);
    repeated.params = { userId: "1234" };
    await controller.postDownloadSpecificAccountData(repeated);
    assert.equal(repeated.response.content?.[0].code, first.response.content?.[0].code);
    const otherSubject = context("5678", 7);
    otherSubject.params = { userId: "12345" };
    await controller.postDownloadSpecificAccountData(otherSubject);
    await waitForExport(rows.at(-1)!);
    assert.lengthOf(rows, 3);
    assert.notEqual(otherSubject.response.content?.[0].code, first.response.content?.[0].code);
    assert.equal(rows.at(-1)!.ref, "user-12345");
    assert.equal(rows.at(-1)!.requesterId, 7);
  });

  test("duplicate insert recovery returns the concurrent job belonging to this requester", async ({ assert }) => {
    await PortalDataExport.create({
      ref: "user-1234",
      requesterId: 1,
      code: "other-requester",
      status: "processing",
      filePath: null,
      completedAt: null,
    });
    const create = PortalDataExport.create;
    mock.method(PortalDataExport, "create", async () => {
      await create.call(PortalDataExport, {
        ref: "user-1234",
        requesterId: 2,
        code: "concurrent-requester",
        status: "processing",
        filePath: null,
        completedAt: null,
      });
      throw Object.assign(new Error("Duplicate export"), { code: "ER_DUP_ENTRY" });
    });
    const build = async () => {
      assert.fail("The concurrent job must be reused");
      return Buffer.alloc(0);
    };
    const job = await dataExports.startDataExport("user-1234", 2, build);
    assert.equal(job.code, "concurrent-requester");
    assert.equal(job.requesterId, 2);
  });

  test("does not expose an old portal user's archive after the account is recreated", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    for (const action of ["getStatus", "getDownload"] as const) {
      const ctx = context("1234", 2);
      ctx.params = { code: row.code };
      await new DataExportController()[action](ctx);
      assert.equal(ctx.response.response.statusCode, 404);
    }
  });

  test("allows retained archives to be requested again without spending the build throttle", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await PortalDataExport.create({
      ref: "user-1234",
      requesterId: 1,
      code: "retained",
      status: "processing",
      filePath: null,
      completedAt: null,
    });
    const ctx = context();
    await dataDownloadThrottle(ctx, async () => new AccountController().postDownloadMyAccountData(ctx));
    const second = context();
    await dataDownloadThrottle(second, async () => new AccountController().postDownloadMyAccountData(second));
    assert.equal(second.response.response.statusCode, 202);
    assert.equal(second.response.content?.[0].code, ctx.response.content?.[0].code);
  });

  test("cleanup expires archives ten minutes after completion and preserves recent and processing jobs", async ({
    assert,
  }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    for (let id = 1; id <= 4; id++) {
      await new AccountController().postDownloadMyAccountData(context(String(id), id));
      await waitForExport(rows.at(-1)!);
    }
    const [expired, recent, processing, failed] = rows;
    const now = Date.now();
    mock.method(Date, "now", () => now);
    expired.completedAt = DateTime.fromMillis(now - 10 * 60_000);
    recent.createdAt = DateTime.fromMillis(now - 2 * 60 * 60_000);
    recent.completedAt = DateTime.fromMillis(now - 10 * 60_000 + 1);
    processing.status = "processing";
    processing.completedAt = null;
    failed.status = "failed";
    failed.completedAt = DateTime.fromMillis(now - 11 * 60_000);
    const expiredPath = expired.filePath!;
    const failedPath = failed.filePath!;
    await dataExports.cleanupExpiredDataExports();
    assert.deepEqual(rows, [recent, processing]);
    await assert.rejects(() => access(expiredPath));
    await assert.rejects(() => access(failedPath));
    await access(recent.filePath!);
    await access(processing.filePath!);
  });

  test("cleanup continues after one archive cannot be removed", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context("1234", 1));
    await waitForExport(rows[0]);
    await new AccountController().postDownloadMyAccountData(context("5678", 2));
    await waitForExport(rows[1]);
    const [blocked, expired] = rows;
    blocked.completedAt = expired.completedAt = DateTime.utc().minus({ minutes: 11 });
    mock.method(blocked, "lockForUpdate", async () => {
      throw new Error("File cannot be removed");
    });
    const expiredPath = expired.filePath!;
    await dataExports.cleanupExpiredDataExports();
    assert.deepEqual(rows, [blocked]);
    await assert.rejects(() => access(expiredPath));
  });

  test("cleanup task sweeps at startup and every minute, then stops on shutdown", async ({ assert, cleanup }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context("1234", 1));
    await waitForExport(rows[0]);
    await new AccountController().postDownloadMyAccountData(context("5678", 2));
    await waitForExport(rows[1]);
    const [expired, recent] = rows;
    expired.completedAt = DateTime.utc().minus({ minutes: 11 });
    const expiredPath = expired.filePath!;
    const recentPath = recent.filePath!;
    mock.timers.enable({ apis: ["setInterval"] });
    cleanup(() => mock.timers.reset());
    const { default: Provider } = await import("#providers/dataExportCleanupProvider");
    const provider = new Provider();
    cleanup(() => provider.shutdown());
    await provider.ready();
    assert.deepEqual(rows, [recent]);
    await assert.rejects(() => access(expiredPath));

    recent.completedAt = DateTime.utc().minus({ minutes: 11 });
    mock.timers.tick(60_000);
    // Shutdown waits for an in-flight sweep to finish.
    await provider.shutdown();
    assert.lengthOf(rows, 0);
    await assert.rejects(() => access(recentPath));

    await new AccountController().postDownloadMyAccountData(context("9012", 3));
    const afterShutdown = rows[0];
    await waitForExport(afterShutdown);
    afterShutdown.completedAt = DateTime.utc().minus({ minutes: 11 });
    mock.timers.tick(60_000);
    await delay(5);
    assert.deepEqual(rows, [afterShutdown]);
    await access(afterShutdown.filePath!);
  });

  test("cleanup task recovers when its startup query fails", async ({ assert, cleanup }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    row.completedAt = DateTime.utc().minus({ minutes: 11 });
    const query = PortalDataExport.query;
    mock.method(PortalDataExport, "query", () => {
      throw new Error("Database temporarily unavailable");
    });
    mock.timers.enable({ apis: ["setInterval"] });
    cleanup(() => mock.timers.reset());
    const { default: Provider } = await import("#providers/dataExportCleanupProvider");
    const provider = new Provider();
    cleanup(() => provider.shutdown());
    await provider.ready();
    assert.lengthOf(rows, 1);
    mock.method(PortalDataExport, "query", query);
    mock.timers.tick(60_000);
    await provider.shutdown();
    assert.lengthOf(rows, 0);
  });

  test("records a failed job so polling can stop", async ({ assert }) => {
    addCategory(async () => {
      throw new Error("Data collection failed");
    });
    const ctx = context();
    await new AccountController().postDownloadMyAccountData(ctx);
    assert.equal(ctx.response.response.statusCode, 202);
    await waitForExport(rows[0]);
    assert.equal(rows[0].status, "failed");
    assert.isNotNull(rows[0].completedAt);
    assert.isNull(rows[0].filePath);
  });

  test("polls by code without exposing the temporary path", async ({ assert }) => {
    const row = await PortalDataExport.create({
      ref: "user-1234",
      requesterId: 1,
      code: "poll-code",
      status: "processing",
      filePath: null,
      completedAt: null,
    });
    const ctx = context();
    ctx.params = { code: row.code };
    await new DataExportController().getStatus(ctx);
    assert.deepEqual(ctx.response.content?.[0], { status: "processing" });
    assert.equal(ctx.response.getHeader("Cache-Control"), "no-store");
  });

  test("denies other users access to status and files", async ({ assert }) => {
    await PortalDataExport.create({
      ref: "user-1234",
      requesterId: 1,
      code: "private-code",
      status: "completed",
      filePath: null,
      completedAt: DateTime.utc(),
    });
    const controller = new DataExportController();
    for (const action of ["getStatus", "getDownload"] as const) {
      const ctx = context("5678", 2);
      ctx.params = { code: "private-code" };
      await controller[action](ctx);
      assert.equal(ctx.response.response.statusCode, 404);
    }
    assert.lengthOf(rows, 1);
  });

  test("keeps the same archive available for repeated downloads during retention", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    const path = row.filePath!;
    const controller = new DataExportController();
    const download = context();
    download.params = { code: row.code };
    await controller.getDownload(download);
    assert.equal(download.response.fileToStream?.path, path);
    assert.equal(download.response.getHeader("Cache-Control"), "no-store");
    assert.lengthOf(rows, 1);
    await access(path);

    const again = context();
    await new AccountController().postDownloadMyAccountData(again);
    assert.equal(again.response.content?.[0].code, row.code);
    const redownload = context();
    redownload.params = { code: row.code };
    await controller.getDownload(redownload);
    assert.equal(redownload.response.fileToStream?.path, path);
    assert.lengthOf(rows, 1);
    await access(path);
  });

  test("rejects downloading an export that is still processing", async ({ assert }) => {
    await PortalDataExport.create({
      ref: "user-1234",
      requesterId: 1,
      code: "pending-code",
      status: "processing",
      filePath: null,
      completedAt: null,
    });
    const ctx = context();
    ctx.params = { code: "pending-code" };
    await new DataExportController().getDownload(ctx);
    assert.equal(ctx.response.response.statusCode, 409);
    assert.lengthOf(rows, 1);
  });

  test("marks a stalled job failed and allows a new export", async ({ assert }) => {
    const row = await PortalDataExport.create({
      ref: "user-1234",
      requesterId: 1,
      code: "stalled-code",
      status: "processing",
      filePath: null,
      completedAt: null,
    });
    row.createdAt = DateTime.utc().minus({ hours: 2 });
    const ctx = context();
    ctx.params = { code: row.code };
    await new DataExportController().getStatus(ctx);
    assert.deepEqual(ctx.response.content?.[0], { status: "failed" });

    addCategory(async () => ({ columns: ["value"], rows: [] }));
    const restarted = context();
    await new AccountController().postDownloadMyAccountData(restarted);
    assert.notEqual(restarted.response.content?.[0].code, "stalled-code");
    assert.lengthOf(rows, 1);
    await waitForExport(rows[0]);
  });

  test("allows an export to be rebuilt if its temporary file was removed", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    await rm(dirname(row.filePath!), { recursive: true, force: true });
    const ctx = context();
    ctx.params = { code: row.code };
    await new DataExportController().getStatus(ctx);
    assert.deepEqual(ctx.response.content?.[0], { status: "failed" });
    const restarted = context();
    await new AccountController().postDownloadMyAccountData(restarted);
    assert.notEqual(restarted.response.content?.[0].code, row.code);
    await waitForExport(rows[0]);
    assert.equal(rows[0].status, "completed");
  });

  test("cleanup deletes only the export file", async ({ assert, cleanup }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    const directory = dirname(row.filePath!);
    cleanup(() => rm(directory, { recursive: true, force: true }));
    const sibling = join(directory, "unrelated.txt");
    await writeFile(sibling, "keep me");
    row.completedAt = DateTime.utc().minus({ minutes: 11 });
    await dataExports.cleanupExpiredDataExports();
    assert.equal(await readFile(sibling, "utf8"), "keep me");
    assert.lengthOf(rows, 0);
  });

  test("deleting account data removes every requester archive for that subject", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [{ value: "personal data" }] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    const path = row.filePath!;
    const staff = context("5678", 2);
    staff.params = { userId: "1234" };
    await new AccountController().postDownloadSpecificAccountData(staff);
    assert.lengthOf(rows, 2);
    const staffExport = rows[1];
    await waitForExport(staffExport);
    const staffPath = staffExport.filePath!;
    const unrelated = context("12345", 3);
    await new AccountController().postDownloadMyAccountData(unrelated);
    const unrelatedExport = rows.at(-1)!;
    await waitForExport(unrelatedExport);
    mock.method(
      db,
      "transaction",
      async () =>
        ({
          commit: async () => {},
          rollback: async () => {},
        }) as unknown as TransactionClientContract,
    );
    const ctx = context();
    ctx.params = { userId: "1234" };
    ctx.session = { flash: () => {} } as unknown as HttpContext["session"];
    await new AccountController().postDeleteSpecificAccountData(ctx);
    assert.deepEqual(rows, [unrelatedExport]);
    await assert.rejects(() => access(path));
    await assert.rejects(() => access(staffPath));
    await access(unrelatedExport.filePath!);
  });

  test("removes the ZIP when its job is invalidated just before publication", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    let path: string | undefined;
    beforeUpdate = (values) => {
      if (values.status === "completed") {
        path = values.filePath as string;
        rows = [];
      }
    };
    // Lucid also resolves save() successfully when its UPDATE affects zero rows.
    mock.method(row, "save", async () => {
      if (row.status === "completed") {
        path = row.filePath!;
        rows = [];
      }
      return row;
    });
    await waitForExport(row);
    assert.isDefined(path);
    assert.lengthOf(rows, 0);
    await assert.rejects(() => access(path!));
  });

  test("returns 401 for export API requests when the session expires", async ({ assert }) => {
    const ctx = new HttpContextFactory().create();
    ctx.request.request.method = "GET";
    ctx.request.request.headers.accept = "application/json";
    Object.defineProperty(ctx, "auth", { value: { check: async () => false } });
    ctx.session = { setIntendedUrl: () => {} } as unknown as HttpContext["session"];
    ctx.inertia = { render: async () => "Login page" } as unknown as HttpContext["inertia"];
    await new AuthPageMiddleware().handle(ctx, async () => {
      assert.fail("The export API requires authentication");
    });
    assert.equal(ctx.response.response.statusCode, 401);
  });
});
