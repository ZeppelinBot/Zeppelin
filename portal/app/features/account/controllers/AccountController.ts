import { accountDataCategories, DataContainer } from "#backend/features/account/accountDataDefinitions";
import AllowedGuild from "#backend/features/guilds/models/AllowedGuild";
import { deleteDataExport, startDataExport } from "#backend/features/dataExport/dataExports";
import PortalDataExport from "#backend/features/dataExport/models/PortalDataExport";
import type { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";
import { stringify as toCsv } from "csv-stringify/sync";
import JSZip from "jszip";

interface CollectedData {
  name: string;
  prettyName: string;
  data: DataContainer<string>;
}

export default class AccountController {
  async getMyAccountPage({ inertia }: HttpContext) {
    return inertia.render("features/account/pages/MyAccountPage", {});
  }

  async postDownloadMyAccountData({ response, auth }: HttpContext) {
    const userId = auth.user!.discordUserId;
    const job = await startDataExport(`user-${userId}`, () => buildAccountDataZip(userId));
    response.header("Cache-Control", "no-store");
    return response.accepted({ code: job.code });
  }

  async postDeleteMyAccountData({ response, auth, session, inertia }: HttpContext) {
    const userId = auth.user!.discordUserId;
    await deleteAccountData(userId);

    await auth.use("web").logout();

    session.regenerate();
    session.flash("success", "Your data has been deleted and you have been logged out");

    inertia.clearHistory();
    return response.redirect("/");
  }

  async getSpecificAccountPage({ inertia, params }: HttpContext) {
    const userId = String(params.userId);
    return inertia.render("features/account/pages/SpecificAccountPage", { userId });
  }

  async postDownloadSpecificAccountData({ params, response }: HttpContext) {
    const userId = String(params.userId);
    const job = await startDataExport(`user-${userId}`, () => buildAccountDataZip(userId));
    response.header("Cache-Control", "no-store");
    return response.accepted({ code: job.code });
  }

  async postDeleteSpecificAccountData({ params, response, session }: HttpContext) {
    const userId = String(params.userId);
    await deleteAccountData(userId);

    session.flash("success", `Data of user ${userId} has been deleted`);
    response.redirect(`/specific-account/${userId}`);
  }
}

async function buildAccountDataZip(userId: string) {
  const collectedDataList = await collectAccountData(userId);
  const zip = new JSZip();
  for (const collectedData of collectedDataList) {
    const rows = [
      collectedData.data.columns,
      ...collectedData.data.rows.map((row) => {
        return collectedData.data.columns.map((column) => row[column] ?? "");
      }),
    ];
    zip.file(`${collectedData.name}.csv`, toCsv(rows, { escape_formulas: true }));
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

async function collectAccountData(userId: string): Promise<CollectedData[]> {
  const collectedDataList: CollectedData[] = [];
  const guildIdsProcessingData = new Set<string>();
  for (const category of accountDataCategories) {
    if (category.userSelfServeTools.getData) {
      collectedDataList.push({
        name: category.name,
        prettyName: category.prettyName,
        data: await category.userSelfServeTools.getData(userId),
      });
    }
    if (category.userSelfServeTools.getGuildIdsProcessingData) {
      for (const guildId of await category.userSelfServeTools.getGuildIdsProcessingData(userId)) {
        guildIdsProcessingData.add(guildId);
      }
    }
  }

  const guildsProcessingData: Map<string, AllowedGuild> = new Map();
  if (guildIdsProcessingData.size) {
    const guilds = await AllowedGuild.query().whereIn("id", Array.from(guildIdsProcessingData.values())).select();
    for (const guild of guilds) {
      guildsProcessingData.set(guild.id, guild);
    }
  }
  collectedDataList.push({
    name: "servers_processing_data_about_you",
    prettyName: "Servers processing data about you",
    data: {
      columns: ["serverId", "serverName", "ownerId"],
      rows: Array.from(guildIdsProcessingData.values()).map((guildId) => {
        const guild = guildsProcessingData.get(guildId);
        return {
          serverId: guildId,
          serverName: guild?.name ?? "",
          ownerId: guild?.ownerId ?? "",
        };
      }),
    },
  });

  return collectedDataList;
}

async function deleteAccountData(userId: string): Promise<void> {
  const trx = await db.transaction();
  try {
    for (const category of accountDataCategories) {
      if (category.userSelfServeTools.deleteData) {
        await category.userSelfServeTools.deleteData(userId, trx);
      }
    }
    await trx.commit();
  } catch (err) {
    await trx.rollback();
    throw err;
  }
  const dataExport = await PortalDataExport.findBy("ref", `user-${userId}`);
  if (dataExport) {
    await deleteDataExport(dataExport);
  }
}
