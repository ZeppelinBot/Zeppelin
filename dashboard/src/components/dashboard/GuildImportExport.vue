<template>
  <div>
    <h1>Import / Export</h1>
    <p>
      <strong>Note!</strong>
      This feature is currently experimental. Make sure to always export a backup before importing server data. If you encounter any issues, please report them on the [Zeppelin Discord server](https://discord.gg/zeppelin).
    </p>

    <h2>Export server data</h2>
    <button class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :class="{ 'bg-gray-800': exportData, 'hover:bg-gray-800': !exportData }" @click="runExport()" :disabled="exportData">Create export file</button>
    <button class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :class="{ 'bg-gray-800': !exportData, 'hover:bg-gray-800': exportData }" :disabled="!exportData" @click="downloadExportFile">Download export file</button>

    <p v-if="exportError">Error: {{ exportError }}</p>
    <p v-else-if="exporting">Creating export file...</p>
    <p v-else>&nbsp;</p>

    <h2>Import server data</h2>
    <p>
      <strong>Note!</strong>
      Always take a backup of your existing data above before importing.
    </p>
    <div class="mb-4">
      <h3>Import file</h3>
      <input type="file" @change="selectImportFile($event.target.files[0])">
    </div>
    <div class="mb-4">
      <h3>Case options</h3>
      <label><input type="radio" v-model="importCaseMode" value="bumpImportedCases"> Leave existing case numbers, start imported cases from the end</label><br>
      <label><input type="radio" v-model="importCaseMode" value="bumpExistingCases"> Leave imported case numbers, re-number existing cases to start after imported cases</label><br>
      <label><input type="radio" v-model="importCaseMode" value="replace"> Replace existing cases (!! THIS WILL DELETE ALL EXISTING CASES !!)</label>
    </div>
    <button class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :class="{ 'bg-gray-800': importFile == null, 'hover:bg-gray-800': importFile != null }" @click="runImport()" :disabled="importFile == null">Import selected file</button>

    <p v-if="importError">Error: {{ importError }}</p>
    <p v-else-if="importing">Importing...</p>
    <p v-else>&nbsp;</p>
  </div>
</template>

<script lang="ts">
import { mapState } from "vuex";
import { ApiPermissions, hasPermission } from "@shared/apiPermissions";
import { AuthState, GuildState } from "../../store/types";
import { ApiError } from "../../api";
import moment from "moment";

export default {
  async mounted() {
    try {
      await this.$store.dispatch("guilds/loadGuild", this.$route.params.guildId);
    } catch (err) {
      if (err instanceof ApiError) {
        this.$router.push('/dashboard');
        return;
      }

      throw err;
    }

    if (this.guild == null) {
      this.$router.push('/dashboard');
      return;
    }

    this.loading = false;
  },
  computed: {
    ...mapState("guilds", {
      guild(guilds: GuildState) {
        return guilds.available.get(this.$route.params.guildId);
      },
    }),
  },
  data() {
    return {
      loading: true,

      importing: false,
      importError: null,
      importFile: null,
      importCaseMode: "bumpImportedCases",

      exporting: false,
      exportError: null,
      exportData: null,
    };
  },
  methods: {
    selectImportFile(file: File) {
      this.importFile = file;
    },
    async runImport() {
      if (this.importing) {
        return;
      }

      if (! this.importFile) {
        return;
      }

      this.importError = null;
      this.importing = true;

      try {
        await this.$store.dispatch("guilds/importData", {
          guildId: this.$route.params.guildId,
          data: JSON.parse(await (this.importFile as File).text()),
          caseHandlingMode: this.importCaseMode,
        });
      } catch (err) {
        this.importError = err.body?.error ?? String(err);
        return;
      } finally {
        this.importing = false;
        this.importFile = null;
      }

      window.alert("Data imported successfully!");
    },
    async runExport() {
      if (this.exporting) {
        return;
      }

      if (this.exportData) {
        return;
      }

      this.exportError = null;
      this.exporting = true;

      try {
        this.exportData = await this.$store.dispatch("guilds/exportData", {
          guildId: this.$route.params.guildId,
        });
      } catch (err) {
        this.exportError = err.body?.error ?? String(err);
        return;
      } finally {
        this.exporting = false;
      }
    },
    downloadExportFile() {
      if (!this.exportData) {
        return;
      }

      const dl = document.createElement("a");
      dl.setAttribute("href", `data:application/json,${encodeURIComponent(JSON.stringify(this.exportData, null, 2))}`);
      dl.setAttribute("download", `export_${this.$route.params.guildId}_${moment().format("YYYY-MM-DD_HH-mm-ss")}.json`);
      dl.style.display = "none";

      document.body.appendChild(dl);
      dl.click();
      document.body.removeChild(dl);
    },
  },
};
</script>
