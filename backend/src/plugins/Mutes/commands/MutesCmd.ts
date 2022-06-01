import { GuildMember, MessageActionRow, MessageButton, MessageComponentInteraction, Snowflake } from "discord.js";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { humanizeDurationShort } from "../../../humanizeDurationShort";
import { getBaseUrl } from "../../../pluginUtils";
import { DBDateFormat, MINUTES, resolveMember } from "../../../utils";
import { IMuteWithDetails, mutesCmd } from "../types";

export const MutesCmd = mutesCmd({
  trigger: "mutes",
  permission: "can_view_list",

  signature: {
    age: ct.delay({
      option: true,
      shortcut: "a",
    }),

    left: ct.switchOption({ def: false, shortcut: "l" }),
    manual: ct.switchOption({ def: false, shortcut: "m" }),
    export: ct.switchOption({ def: false, shortcut: "e" }),
  },

  async run({ pluginData, message: msg, args }) {
    const listMessagePromise = msg.channel.send("Loading mutes...");
    const mutesPerPage = 10;
    let totalMutes = 0;
    let hasFilters = false;

    let stopCollectionFn = () => {
      return;
    };
    let stopCollectionTimeout: NodeJS.Timeout;
    const stopCollectionDebounce = 5 * MINUTES;

    const bumpCollectionTimeout = () => {
      clearTimeout(stopCollectionTimeout);
      stopCollectionTimeout = setTimeout(stopCollectionFn, stopCollectionDebounce);
    };

    let lines: string[] = [];

    // Active, logged mutes
    const activeMutes = await pluginData.state.mutes.getActiveMutes();
    activeMutes.sort((a, b) => {
      if (a.expires_at == null && b.expires_at != null) return 1;
      if (b.expires_at == null && a.expires_at != null) return -1;
      if (a.expires_at == null && b.expires_at == null) {
        return a.created_at > b.created_at ? -1 : 1;
      }
      return a.expires_at! > b.expires_at! ? 1 : -1;
    });

    if (args.manual) {
      // Show only manual mutes (i.e. "Muted" role added without a logged mute)
      const muteUserIds = new Set(activeMutes.map((m) => m.user_id));
      const manuallyMutedMembers: GuildMember[] = [];
      const muteRole = pluginData.config.get().mute_role;

      if (muteRole) {
        pluginData.guild.members.cache.forEach((member) => {
          if (muteUserIds.has(member.id)) return;
          if (member.roles.cache.has(muteRole as Snowflake)) manuallyMutedMembers.push(member);
        });
      }

      totalMutes = manuallyMutedMembers.length;

      lines = manuallyMutedMembers.map((member) => {
        return `<@!${member.id}> (**${member.user.tag}**, \`${member.id}\`)   🔧 Manual mute`;
      });
    } else {
      // Show filtered active mutes (but not manual mutes)
      let filteredMutes: IMuteWithDetails[] = activeMutes;
      let bannedIds: string[] | null = null;

      // Filter: mute age
      if (args.age) {
        const cutoff = moment.utc().subtract(args.age, "ms").format(DBDateFormat);
        filteredMutes = filteredMutes.filter((m) => m.created_at <= cutoff);
        hasFilters = true;
      }

      // Fetch some extra details for each mute: the muted member, and whether they've been banned
      for (const [index, mute] of filteredMutes.entries()) {
        const muteWithDetails = { ...mute };

        const member = await resolveMember(pluginData.client, pluginData.guild, mute.user_id);

        if (!member) {
          if (!bannedIds) {
            const bans = await pluginData.guild.bans.fetch({ cache: true });
            bannedIds = bans.map((u) => u.user.id);
          }

          muteWithDetails.banned = bannedIds.includes(mute.user_id);
        } else {
          muteWithDetails.member = member;
        }

        filteredMutes[index] = muteWithDetails;
      }

      // Filter: left the server
      if (args.left != null) {
        filteredMutes = filteredMutes.filter((m) => (args.left && !m.member) || (!args.left && m.member));
        hasFilters = true;
      }

      totalMutes = filteredMutes.length;

      // Create a message line for each mute
      const caseIds = filteredMutes.map((m) => m.case_id).filter((v) => !!v);
      const muteCases = caseIds.length ? await pluginData.state.cases.get(caseIds) : [];
      const muteCasesById = muteCases.reduce((map, c) => map.set(c.id, c), new Map());

      lines = filteredMutes.map((mute) => {
        const user = pluginData.client.users.resolve(mute.user_id as Snowflake);
        const username = user ? user.tag : "Unknown#0000";
        const theCase = muteCasesById.get(mute.case_id);
        const caseName = theCase ? `Case #${theCase.case_number}` : "No case";

        let line = `<@!${mute.user_id}> (**${username}**, \`${mute.user_id}\`)   📋 ${caseName}`;

        if (mute.expires_at) {
          const timeUntilExpiry = moment.utc().diff(moment.utc(mute.expires_at, DBDateFormat));
          const humanizedTime = humanizeDurationShort(timeUntilExpiry, { largest: 2, round: true });
          line += `   ⏰ Expires in ${humanizedTime}`;
        } else {
          line += `   ⏰ Indefinite`;
        }

        const timeFromMute = moment.utc(mute.created_at, DBDateFormat).diff(moment.utc());
        const humanizedTimeFromMute = humanizeDurationShort(timeFromMute, { largest: 2, round: true });
        line += `   🕒 Muted ${humanizedTimeFromMute} ago`;

        if (mute.banned) {
          line += `   🔨 Banned`;
        } else if (!mute.member) {
          line += `   ❌ Left server`;
        }

        return line;
      });
    }

    const listMessage = await listMessagePromise;

    let currentPage = 1;
    const totalPages = Math.ceil(lines.length / mutesPerPage);

    const drawListPage = async (page) => {
      page = Math.max(1, Math.min(totalPages, page));
      currentPage = page;

      const pageStart = (page - 1) * mutesPerPage;
      const pageLines = lines.slice(pageStart, pageStart + mutesPerPage);

      const pageRangeText = `${pageStart + 1}–${pageStart + pageLines.length} of ${totalMutes}`;

      let message;
      if (args.manual) {
        message = `Showing manual mutes ${pageRangeText}:`;
      } else if (hasFilters) {
        message = `Showing filtered active mutes ${pageRangeText}:`;
      } else {
        message = `Showing active mutes ${pageRangeText}:`;
      }

      message += "\n\n" + pageLines.join("\n");

      listMessage.edit(message);
      bumpCollectionTimeout();
    };

    if (totalMutes === 0) {
      if (args.manual) {
        listMessage.edit("No manual mutes found!");
      } else if (hasFilters) {
        listMessage.edit("No mutes found with the specified filters!");
      } else {
        listMessage.edit("No active mutes!");
      }
    } else if (args.export) {
      const archiveId = await pluginData.state.archives.create(lines.join("\n"), moment.utc().add(1, "hour"));
      const baseUrl = getBaseUrl(pluginData);
      const url = await pluginData.state.archives.getUrl(baseUrl, archiveId);

      await listMessage.edit(`Exported mutes: ${url}`);
    } else {
      drawListPage(1);

      if (totalPages > 1) {
        const idMod = `${listMessage.id}:muteList`;
        const buttons: MessageButton[] = [];

        buttons.push(new MessageButton().setStyle("SECONDARY").setEmoji("⬅").setCustomId(`previousButton:${idMod}`));

        buttons.push(new MessageButton().setStyle("SECONDARY").setEmoji("➡").setCustomId(`nextButton:${idMod}`));

        const row = new MessageActionRow().addComponents(buttons);
        await listMessage.edit({ components: [row] });

        const collector = listMessage.createMessageComponentCollector({ time: stopCollectionDebounce });

        collector.on("collect", async (interaction: MessageComponentInteraction) => {
          if (msg.author.id !== interaction.user.id) {
            interaction
              .reply({ content: `You are not permitted to use these buttons.`, ephemeral: true })
              .catch((err) => console.trace(err.message));
          } else {
            collector.resetTimer();
            await interaction.deferUpdate();
            if (interaction.customId === `previousButton:${idMod}` && currentPage > 1) {
              await drawListPage(currentPage - 1);
            } else if (interaction.customId === `nextButton:${idMod}` && currentPage < totalPages) {
              await drawListPage(currentPage + 1);
            }
          }
        });

        stopCollectionFn = async () => {
          collector.stop();
          await listMessage.edit({ content: listMessage.content, components: [] });
        };
        bumpCollectionTimeout();
      }
    }
  },
});
