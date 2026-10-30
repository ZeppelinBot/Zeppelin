import { accountDataCategories } from "#backend/features/account/accountDataDefinitions";
import AccountController from "#backend/features/account/controllers/AccountController";
import AuthPageMiddleware from "#backend/features/auth/middleware/authPageMiddleware";
import DataExportController from "#backend/features/dataExport/controllers/DataExportController";
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

function context(userId = "1234") {
  const ctx = new HttpContextFactory().create();
  Object.defineProperty(ctx, "auth", { value: { user: { discordUserId: userId } } });
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
      const filters: Array<[keyof PortalDataExport, unknown]> = [];
      const query = {
        where(key: keyof PortalDataExport, value: unknown) {
          filters.push([key, value]);
          return query;
        },
        async update(values: Record<string, unknown>) {
          beforeUpdate?.(values);
          const matches = rows.filter((row) => filters.every(([key, value]) => row[key] === value));
          for (const row of matches) {
            row.merge({ ...values, completedAt: DateTime.fromJSDate(values.completedAt as Date) });
          }
          return [matches.length];
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
    assert.equal(rows[0].completedAt, null);
    await waitForExport(rows[0]);
    assert.equal(rows[0].status, "completed");
    assert.isNotNull(rows[0].completedAt);
    assert.match(rows[0].filePath!, /^\/tmp\/zeppelin-data-export-/);
    const zip = await JSZip.loadAsync(await readFile(rows[0].filePath!));
    assert.equal(await zip.file("test_data.csv")!.async("string"), "value\nhello\n");
  });

  test("reuses an existing export for the same Discord user", async ({ assert }) => {
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

  test("denies other users access to status, files, and cleanup", async ({ assert }) => {
    await PortalDataExport.create({
      ref: "user-1234",
      code: "private-code",
      status: "completed",
      filePath: null,
      completedAt: DateTime.utc(),
    });
    const controller = new DataExportController();
    for (const action of ["getStatus", "getDownload", "deleteExport"] as const) {
      const ctx = context("5678");
      ctx.params = { code: "private-code" };
      await controller[action](ctx);
      assert.equal(ctx.response.response.statusCode, 404);
    }
    assert.lengthOf(rows, 1);
  });

  test("keeps the ZIP until the browser acknowledges receipt, then removes the file and row", async ({ assert }) => {
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

    const acknowledge = context();
    acknowledge.params = { code: row.code };
    await controller.deleteExport(acknowledge);
    assert.equal(acknowledge.response.response.statusCode, 204);
    assert.lengthOf(rows, 0);
    await assert.rejects(() => access(path));
  });

  test("rejects download and cleanup while an export is processing", async ({ assert }) => {
    await PortalDataExport.create({
      ref: "user-1234",
      code: "pending-code",
      status: "processing",
      filePath: null,
      completedAt: null,
    });
    const controller = new DataExportController();
    for (const action of ["getDownload", "deleteExport"] as const) {
      const ctx = context();
      ctx.params = { code: "pending-code" };
      await controller[action](ctx);
      assert.equal(ctx.response.response.statusCode, 409);
    }
    assert.lengthOf(rows, 1);
  });

  test("marks a stalled job failed and allows a new export", async ({ assert }) => {
    const row = await PortalDataExport.create({
      ref: "user-1234",
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
    const ctx = context();
    ctx.params = { code: row.code };
    await new DataExportController().deleteExport(ctx);
    assert.equal(await readFile(sibling, "utf8"), "keep me");
    assert.lengthOf(rows, 0);
  });

  test("deleting account data removes a retained export", async ({ assert }) => {
    addCategory(async () => ({ columns: ["value"], rows: [{ value: "personal data" }] }));
    await new AccountController().postDownloadMyAccountData(context());
    const row = rows[0];
    await waitForExport(row);
    const path = row.filePath!;
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
    assert.lengthOf(rows, 0);
    await assert.rejects(() => access(path));
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
