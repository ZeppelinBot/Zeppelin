<template>
  <p>
    <BasicButton>
      <button type="button" :disabled="busy" @click="download">
        {{ busy ? "Preparing your download…" : "Download account data" }}
      </button>
    </BasicButton>
  </p>
  <p v-if="message" role="status">{{ message }}</p>
  <p v-if="error" role="alert">{{ error }}</p>
</template>

<script setup lang="ts">
import BasicButton from "#frontend/components/BasicButton.vue";
import { downloadDataExport } from "#frontend/features/account/dataExportDownload.js";
import { onBeforeUnmount, ref } from "vue";

const props = defineProps<{ startUrl: string; filename: string }>();
const busy = ref(false);
const message = ref("");
const error = ref("");
let abort: AbortController | undefined;

onBeforeUnmount(() => abort?.abort());

async function download() {
  if (busy.value) {
    return;
  }
  busy.value = true;
  error.value = "";
  abort = new AbortController();
  const signal = abort.signal;
  try {
    await downloadDataExport(props.startUrl, {
      csrfToken: document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? "",
      signal,
      onStatus(status) {
        message.value = {
          processing: "Building your data archive. You can keep this page open while it is prepared.",
          downloading: "Downloading your data archive…",
          downloaded: "Your download is ready.",
        }[status];
      },
      onDownload(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = props.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Give the browser time to start reading the object URL.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
    });
  } catch (cause) {
    if (!signal.aborted) {
      message.value = "";
      error.value = cause instanceof Error ? cause.message : "Unable to download your data export. Please try again.";
    }
  } finally {
    busy.value = false;
  }
}
</script>
