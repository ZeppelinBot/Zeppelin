import { test } from "@japa/runner";
import { mock } from "node:test";

// Load the client at runtime: it belongs to the separate Inertia TS project.
const clientUrl = new URL("../../../inertia/features/account/dataExportDownload.js", import.meta.url).href;
const { downloadDataExport } = await import(clientUrl);

test.group("Data export download client", (group) => {
  group.each.teardown(() => mock.restoreAll());

  test("polls until ready and downloads without deleting the retained export", async ({ assert }) => {
    const requests: Array<{ url: string; method: string }> = [];
    const received = Promise.withResolvers<void>();
    let polls = 0;
    mock.method(globalThis, "fetch", async (url: string, options: RequestInit = {}) => {
      requests.push({ url, method: options.method ?? "GET" });
      if (url === "/account/download-data") {
        assert.equal(new Headers(options.headers).get("X-CSRF-TOKEN"), "csrf-token");
        return Response.json({ code: "test-code" }, { status: 202 });
      }
      if (url.endsWith("/download")) {
        return new Response("ZIP contents", { headers: { "Content-Type": "application/zip" } });
      }
      polls++;
      return Response.json({ status: polls === 1 ? "processing" : "completed" });
    });

    await downloadDataExport("/account/download-data", {
      csrfToken: "csrf-token",
      signal: new AbortController().signal,
      onStatus: () => {},
      onDownload: async (blob: Blob) => {
        assert.equal(await blob.text(), "ZIP contents");
        assert.isFalse(requests.some((request) => request.method === "DELETE"));
        received.resolve();
      },
    });
    await received.promise;
    assert.deepEqual(requests, [
      { url: "/account/download-data", method: "POST" },
      { url: "/data-exports/test-code", method: "GET" },
      { url: "/data-exports/test-code", method: "GET" },
      { url: "/data-exports/test-code/download", method: "GET" },
    ]);
  }).timeout(5000);

  test("does not download or acknowledge a failed export", async ({ assert }) => {
    const requests: string[] = [];
    mock.method(globalThis, "fetch", async (url: string) => {
      requests.push(url);
      return Response.json(url === "/account/download-data" ? { code: "failed-code" } : { status: "failed" });
    });
    await assert.rejects(
      () =>
        downloadDataExport("/account/download-data", {
          csrfToken: "csrf-token",
          signal: new AbortController().signal,
          onStatus: () => {},
          onDownload: () => assert.fail("A failed export must not be downloaded"),
        }),
      /failed/i,
    );
    assert.deepEqual(requests, ["/account/download-data", "/data-exports/failed-code"]);
  });

  test("stops polling when the page is left", async ({ assert }) => {
    const abort = new AbortController();
    const requests: string[] = [];
    mock.method(globalThis, "fetch", async (url: string) => {
      requests.push(url);
      if (url === "/account/download-data") {
        return Response.json({ code: "pending-code" });
      }
      abort.abort();
      return Response.json({ status: "processing" });
    });
    await assert.rejects(() =>
      downloadDataExport("/account/download-data", {
        csrfToken: "csrf-token",
        signal: abort.signal,
        onStatus: () => {},
        onDownload: () => assert.fail("An aborted export must not be downloaded"),
      }),
    );
    assert.lengthOf(requests, 2);
  });

  test("does not download or acknowledge a login page returned instead of the ZIP", async ({ assert }) => {
    const requests: Array<{ url: string; method: string }> = [];
    mock.method(globalThis, "fetch", async (url: string, options: RequestInit = {}) => {
      requests.push({ url, method: options.method ?? "GET" });
      if (url.endsWith("/download")) {
        return new Response("<html>Please sign in</html>", { headers: { "Content-Type": "text/html" } });
      }
      return Response.json(url === "/account/download-data" ? { code: "expired-code" } : { status: "completed" });
    });
    await assert.rejects(() =>
      downloadDataExport("/account/download-data", {
        csrfToken: "csrf-token",
        signal: new AbortController().signal,
        onStatus: () => {},
        onDownload: () => {},
      }),
    );
    assert.isFalse(requests.some((request) => request.method === "DELETE"));
  });
});
