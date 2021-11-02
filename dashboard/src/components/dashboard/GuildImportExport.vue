<template>
  <div>
    <h1>Import / Export</h1>
    <p>
      <strong>Note!</strong>
      This feature is currently experimental. Make sure to always export a backup before importing server data. If you encounter any issues, please report them on the [Zeppelin Discord server](https://discord.gg/zeppelin).
    </p>

    <h2>Export server data</h2>
    <button class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800 hover:bg-gray-800" @click="runExport()" :disabled="exporting">Export data</button>

    <p v-if="exporting">Opened data export in new window!</p>
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
import { ApiError, formPost } from "../../api";
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

      this.exporting = true;

      formPost(`guilds/${this.$route.params.guildId}/export`, {}, { target: "_blank" });
    },
  },
};
</script>
