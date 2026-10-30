interface DownloadOptions {
  csrfToken: string;
  signal: AbortSignal;
  onStatus: (status: "processing" | "downloading" | "downloaded") => void;
  onDownload: (blob: Blob) => void | Promise<void>;
}

async function checkedFetch(url: string, options: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new Error(
      retryAfter
        ? `Please wait ${retryAfter} seconds before requesting another export.`
        : "Please wait a few minutes before requesting another export.",
    );
  }
  if (response.status === 401) {
    throw new Error("Please sign in again to download your data.");
  }
  if (!response.ok) {
    throw new Error("Unable to download your data export. Please try again.");
  }
  return response;
}

function waitForPoll(signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 2000);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function downloadDataExport(startUrl: string, options: DownloadOptions) {
  const { csrfToken, signal, onStatus, onDownload } = options;
  const headers = { Accept: "application/json", "X-CSRF-TOKEN": csrfToken };
  onStatus("processing");
  const started = await checkedFetch(startUrl, { method: "POST", headers, signal });
  const { code } = (await started.json()) as { code: string };
  const exportUrl = `/data-exports/${encodeURIComponent(code)}`;

  while (true) {
    signal.throwIfAborted();
    const response = await checkedFetch(exportUrl, { headers, signal });
    const { status } = (await response.json()) as { status: string };
    if (status === "completed") {
      break;
    }
    if (status !== "processing") {
      throw new Error("Your data export failed. Please try again in a few minutes.");
    }
    await waitForPoll(signal);
  }

  onStatus("downloading");
  const response = await checkedFetch(`${exportUrl}/download`, { headers, signal });
  if (response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/zip") {
    throw new Error("The server did not return a data archive. Please sign in and try again.");
  }
  const blob = await response.blob();
  signal.throwIfAborted();
  await onDownload(blob);
  onStatus("downloaded");
}
