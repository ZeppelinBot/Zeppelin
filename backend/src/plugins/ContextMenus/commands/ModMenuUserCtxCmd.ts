import {
  APIEmbed,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContextMenuCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  User,
} from "discord.js";
import { GuildPluginData, guildPluginUserContextMenuCommand } from "vety";
import { Case } from "../../../data/entities/Case.js";
import { logger } from "../../../logger.js";
import { SECONDS, UnknownUser, emptyEmbedValue, renderUserUsername, resolveUser, trimLines } from "../../../utils.js";
import { asyncMap } from "../../../utils/async.js";
import { getChunkedEmbedFields } from "../../../utils/getChunkedEmbedFields.js";
import { getGuildPrefix } from "../../../utils/getGuildPrefix.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin.js";
import { getUserInfoEmbed } from "../../Utility/functions/getUserInfoEmbed.js";
import { launchBanActionModal } from "../actions/ban.js";
import { launchMuteActionModal } from "../actions/mute.js";
import { launchNoteActionModal } from "../actions/note.js";
import { launchWarnActionModal } from "../actions/warn.js";
import {
  ContextMenuPluginType,
  LoadModMenuPageFn,
  ModMenuActionOpts,
  ModMenuActionType,
  ModMenuNavigationType,
} from "../types.js";

export const MODAL_TIMEOUT = 60 * SECONDS;
const MOD_MENU_TIMEOUT = 60 * SECONDS;
const CASES_PER_PAGE = 10;

export const ModMenuCmd = guildPluginUserContextMenuCommand({
  name: "Mod Menu",
  defaultMemberPermissions: PermissionFlagsBits.ViewAuditLog.toString(),
  async run({ pluginData, interaction }) {
    await interaction.deferReply({ ephemeral: true });

    // Run permission checks for executing user.
    const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
    const userCfg = await pluginData.config.getMatchingConfig({
      channelId: interaction.channelId,
      member: executingMember,
    });
    if (!userCfg.can_use || !userCfg.can_open_mod_menu) {
      await interaction.followUp({ content: "Error: Insufficient Permissions" });
      return;
    }

    const user = await resolveUser(pluginData.client, interaction.targetId, "ContextMenus:ModMenuCmd");
    if (!user.id) {
      await interaction.followUp("Error: User not found");
      return;
    }

    // Load cases and display mod menu
    const cases: Case[] = await pluginData.state.cases.with("notes").getByUserId(user.id);
    const userName =
      user instanceof UnknownUser && cases.length ? cases[cases.length - 1].user_name : renderUserUsername(user);
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const totalCases = cases.length;
    const totalPages: number = Math.max(Math.ceil(totalCases / CASES_PER_PAGE), 1);
    const prefix = getGuildPrefix(pluginData);
    const infoEmbed = await getUserInfoEmbed(pluginData, user.id, false);
    displayModMenu(
      pluginData,
      interaction,
      totalPages,
      async (page) => {
        const pageCases: Case[] = await pluginData.state.cases
          .with("notes")
          .getRecentByUserId(user.id, CASES_PER_PAGE, (page - 1) * CASES_PER_PAGE);
        const lines = await asyncMap(pageCases, (c) => casesPlugin.getCaseSummary(c, true, interaction.targetId));

        const firstCaseNum = (page - 1) * CASES_PER_PAGE + 1;
        const lastCaseNum = Math.min(page * CASES_PER_PAGE, totalCases);
        const title =
          lines.length == 0
            ? `${userName}`
            : `Most recent cases for ${userName} | ${firstCaseNum}-${lastCaseNum} of ${totalCases}`;

        const embed = {
          author: {
            name: title,
            icon_url: user instanceof User ? user.displayAvatarURL() : undefined,
          },
          fields: [
            ...getChunkedEmbedFields(
              emptyEmbedValue,
              lines.length == 0 ? `No cases found for **${userName}**` : lines.join("\n"),
            ),
            {
              name: emptyEmbedValue,
              value: trimLines(
                lines.length == 0 ? "" : `Use \`${prefix}case <num>\` to see more information about an individual case`,
              ),
            },
          ],
          footer: { text: `Page ${page}/${totalPages}` },
        } satisfies APIEmbed;

        return embed;
      },
      infoEmbed,
      executingMember,
    );
  },
});

async function displayModMenu(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ContextMenuCommandInteraction,
  totalPages: number,
  loadPage: LoadModMenuPageFn,
  infoEmbed: APIEmbed | null,
  executingMember: GuildMember,
) {
  if (interaction.deferred == false) {
    await interaction.deferReply().catch((err) => logger.error(`Mod menu interaction defer failed: ${err}`));
  }

  const firstButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⏪")
    .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.FIRST }))
    .setDisabled(true);
  const prevButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⬅")
    .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.PREV }))
    .setDisabled(true);
  const infoButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel("Info")
    .setEmoji("ℹ")
    .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.INFO }))
    .setDisabled(infoEmbed != null ? false : true);
  const nextButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("➡")
    .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.NEXT }))
    .setDisabled(totalPages > 1 ? false : true);
  const lastButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⏩")
    .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.LAST }))
    .setDisabled(totalPages > 1 ? false : true);
  const navigationButtons = [firstButton, prevButton, infoButton, nextButton, lastButton] satisfies ButtonBuilder[];

  const modactions = pluginData.getPlugin(ModActionsPlugin);
  const moderationButtons = [
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Note")
      .setEmoji("📝")
      .setDisabled(!(await modactions.hasNotePermission(executingMember, interaction.channelId)))
      .setCustomId(serializeCustomId({ action: ModMenuActionType.NOTE, target: interaction.targetId })),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Warn")
      .setEmoji("⚠️")
      .setDisabled(!(await modactions.hasWarnPermission(executingMember, interaction.channelId)))
      .setCustomId(serializeCustomId({ action: ModMenuActionType.WARN, target: interaction.targetId })),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Mute")
      .setEmoji("🔇")
      .setDisabled(!(await modactions.hasMutePermission(executingMember, interaction.channelId)))
      .setCustomId(serializeCustomId({ action: ModMenuActionType.MUTE, target: interaction.targetId })),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Ban")
      .setEmoji("🚫")
      .setDisabled(!(await modactions.hasBanPermission(executingMember, interaction.channelId)))
      .setCustomId(serializeCustomId({ action: ModMenuActionType.BAN, target: interaction.targetId })),
  ] satisfies ButtonBuilder[];

  const navigationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(navigationButtons);
  const moderationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(moderationButtons);

  let page = 1;
  await interaction
    .editReply({
      embeds: [await loadPage(page)],
      components: [navigationRow, moderationRow],
    })
    .then(async (currentPage) => {
      const collector = await currentPage.createMessageComponentCollector({
        time: MOD_MENU_TIMEOUT,
      });

      collector.on("collect", async (i) => {
        const opts = deserializeCustomId(i.customId);
        if (opts.action == ModMenuActionType.PAGE) {
          await i.deferUpdate().catch((err) => logger.error(`Mod menu defer failed: ${err}`));
        }

        // Update displayed embed if any navigation buttons were used
        if (opts.action == ModMenuActionType.PAGE && opts.target == ModMenuNavigationType.INFO && infoEmbed != null) {
          infoButton
            .setLabel("Cases")
            .setEmoji("📋")
            .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.CASES }));
          firstButton.setDisabled(true);
          prevButton.setDisabled(true);
          nextButton.setDisabled(true);
          lastButton.setDisabled(true);

          await i
            .editReply({
              embeds: [infoEmbed],
              components: [navigationRow, moderationRow],
            })
            .catch((err) => logger.error(`Mod menu info view failed: ${err}`));
        } else if (opts.action == ModMenuActionType.PAGE && opts.target == ModMenuNavigationType.CASES) {
          infoButton
            .setLabel("Info")
            .setEmoji("ℹ")
            .setCustomId(serializeCustomId({ action: ModMenuActionType.PAGE, target: ModMenuNavigationType.INFO }));
          updateNavButtonState(firstButton, prevButton, nextButton, lastButton, page, totalPages);

          await i
            .editReply({
              embeds: [await loadPage(page)],
              components: [navigationRow, moderationRow],
            })
            .catch((err) => logger.error(`Mod menu cases view failed: ${err}`));
        } else if (opts.action == ModMenuActionType.PAGE) {
          let pageDelta = 0;
          switch (opts.target) {
            case ModMenuNavigationType.PREV:
              pageDelta = -1;
              break;
            case ModMenuNavigationType.NEXT:
              pageDelta = 1;
              break;
          }

          let newPage = 1;
          if (opts.target == ModMenuNavigationType.PREV || opts.target == ModMenuNavigationType.NEXT) {
            newPage = Math.max(Math.min(page + pageDelta, totalPages), 1);
          } else if (opts.target == ModMenuNavigationType.FIRST) {
            newPage = 1;
          } else if (opts.target == ModMenuNavigationType.LAST) {
            newPage = totalPages;
          }

          if (newPage != page) {
            updateNavButtonState(firstButton, prevButton, nextButton, lastButton, newPage, totalPages);

            await i
              .editReply({
                embeds: [await loadPage(newPage)],
                components: [navigationRow, moderationRow],
              })
              .catch((err) => logger.error(`Mod menu navigation failed: ${err}`));

            page = newPage;
          }
        } else if (opts.action == ModMenuActionType.NOTE) {
          await launchNoteActionModal(pluginData, i as ButtonInteraction, opts.target);
        } else if (opts.action == ModMenuActionType.WARN) {
          await launchWarnActionModal(pluginData, i as ButtonInteraction, opts.target);
        } else if (opts.action == ModMenuActionType.MUTE) {
          await launchMuteActionModal(pluginData, i as ButtonInteraction, opts.target);
        } else if (opts.action == ModMenuActionType.BAN) {
          await launchBanActionModal(pluginData, i as ButtonInteraction, opts.target);
        }

        collector.resetTimer();
      });

      // Remove components on timeout.
      collector.on("end", async (_, reason) => {
        if (reason !== "messageDelete") {
          await interaction
            .editReply({
              components: [],
            })
            .catch((err) => logger.error(`Mod menu timeout failed: ${err}`));
        }
      });
    })
    .catch((err) => logger.error(`Mod menu setup failed: ${err}`));
}

function serializeCustomId(opts: ModMenuActionOpts) {
  return `${opts.action}:${opts.target}`;
}

function deserializeCustomId(customId: string): ModMenuActionOpts {
  const opts: ModMenuActionOpts = {
    action: customId.split(":")[0] as ModMenuActionType,
    target: customId.split(":")[1],
  };

  return opts;
}

function updateNavButtonState(
  firstButton: ButtonBuilder,
  prevButton: ButtonBuilder,
  nextButton: ButtonBuilder,
  lastButton: ButtonBuilder,
  currentPage: number,
  totalPages: number,
) {
  if (currentPage > 1) {
    firstButton.setDisabled(false);
    prevButton.setDisabled(false);
  } else {
    firstButton.setDisabled(true);
    prevButton.setDisabled(true);
  }

  if (currentPage == totalPages) {
    nextButton.setDisabled(true);
    lastButton.setDisabled(true);
  } else {
    nextButton.setDisabled(false);
    lastButton.setDisabled(false);
  }
}
