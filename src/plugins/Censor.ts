import { decorators as d, Plugin } from "knub";
import { Invite, Message } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import {
  deactivateMentions,
  disableCodeBlocks,
  getInviteCodesInString,
  getUrlsInString,
  stripObjectToScalars,
} from "../utils";
import { ZalgoRegex } from "../data/Zalgo";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";

export class CensorPlugin extends Plugin {
  public static pluginName = "censor";

  protected serverLogs: GuildLogs;
  protected savedMessages: GuildSavedMessages;

  private onMessageCreateFn;
  private onMessageUpdateFn;

  getDefaultOptions() {
    return {
      config: {
        filter_zalgo: false,
        filter_invites: false,
        invite_guild_whitelist: null,
        invite_guild_blacklist: null,
        invite_code_whitelist: null,
        invite_code_blacklist: null,
        allow_group_dm_invites: false,

        filter_domains: false,
        domain_whitelist: null,
        domain_blacklist: null,

        blocked_tokens: null,
        blocked_words: null,
        blocked_regex: null,
      },

      overrides: [
        {
          level: ">=50",
          config: {
            filter_zalgo: false,
            filter_invites: false,
            filter_domains: false,
            blocked_tokens: null,
            blocked_words: null,
            blocked_regex: null,
          },
        },
      ],
    };
  }

  onLoad() {
    this.serverLogs = new GuildLogs(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.onMessageUpdateFn = this.onMessageUpdate.bind(this);
    this.savedMessages.events.on("create", this.onMessageCreateFn);
    this.savedMessages.events.on("update", this.onMessageUpdateFn);
  }

  onUnload() {
    this.savedMessages.events.off("create", this.onMessageCreateFn);
    this.savedMessages.events.off("update", this.onMessageUpdateFn);
  }

  async censorMessage(savedMessage: SavedMessage, reason: string) {
    this.serverLogs.ignoreLog(LogType.MESSAGE_DELETE, savedMessage.id);

    try {
      await this.bot.deleteMessage(savedMessage.channel_id, savedMessage.id, "Censored");
    } catch (e) {
      return;
    }

    const member = this.guild.members.get(savedMessage.user_id);
    const channel = this.guild.channels.get(savedMessage.channel_id);

    this.serverLogs.log(LogType.CENSOR, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel),
      reason,
      messageText: disableCodeBlocks(deactivateMentions(savedMessage.data.content)),
    });
  }

  async applyFiltersToMsg(savedMessage: SavedMessage) {
    if (!savedMessage.data.content) return;

    // Filter zalgo
    const filterZalgo = this.configValueForMemberIdAndChannelId(
      savedMessage.user_id,
      savedMessage.channel_id,
      "filter_zalgo",
    );
    if (filterZalgo) {
      const result = ZalgoRegex.exec(savedMessage.data.content);
      if (result) {
        this.censorMessage(savedMessage, "zalgo detected");
        return;
      }
    }

    // Filter invites
    const filterInvites = this.configValueForMemberIdAndChannelId(
      savedMessage.user_id,
      savedMessage.channel_id,
      "filter_invites",
    );
    if (filterInvites) {
      const inviteGuildWhitelist: string[] = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "invite_guild_whitelist",
      );
      const inviteGuildBlacklist: string[] = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "invite_guild_blacklist",
      );
      const inviteCodeWhitelist: string[] = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "invite_code_whitelist",
      );
      const inviteCodeBlacklist: string[] = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "invite_code_blacklist",
      );
      const allowGroupDMInvites: boolean = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "allow_group_dm_invites",
      );

      const inviteCodes = getInviteCodesInString(savedMessage.data.content);

      let invites: Invite[] = await Promise.all(inviteCodes.map(code => this.bot.getInvite(code).catch(() => null)));

      invites = invites.filter(v => !!v);

      for (const invite of invites) {
        if (!invite.guild && !allowGroupDMInvites) {
          this.censorMessage(savedMessage, `group dm invites are not allowed`);
          return;
        }

        if (inviteGuildWhitelist && !inviteGuildWhitelist.includes(invite.guild.id)) {
          this.censorMessage(
            savedMessage,
            `invite guild (**${invite.guild.name}** \`${invite.guild.id}\`) not found in whitelist`,
          );
          return;
        }

        if (inviteGuildBlacklist && inviteGuildBlacklist.includes(invite.guild.id)) {
          this.censorMessage(
            savedMessage,
            `invite guild (**${invite.guild.name}** \`${invite.guild.id}\`) found in blacklist`,
          );
          return;
        }

        if (inviteCodeWhitelist && !inviteCodeWhitelist.includes(invite.code)) {
          this.censorMessage(savedMessage, `invite code (\`${invite.code}\`) not found in whitelist`);
          return;
        }

        if (inviteCodeBlacklist && inviteCodeBlacklist.includes(invite.code)) {
          this.censorMessage(savedMessage, `invite code (\`${invite.code}\`) found in blacklist`);
          return;
        }
      }
    }

    // Filter domains
    const filterDomains = this.configValueForMemberIdAndChannelId(
      savedMessage.user_id,
      savedMessage.channel_id,
      "filter_domains",
    );
    if (filterDomains) {
      const domainWhitelist: string[] = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "domain_whitelist",
      );
      const domainBlacklist: string[] = this.configValueForMemberIdAndChannelId(
        savedMessage.user_id,
        savedMessage.channel_id,
        "domain_blacklist",
      );

      const urls = getUrlsInString(savedMessage.data.content);
      for (const thisUrl of urls) {
        if (domainWhitelist && !domainWhitelist.includes(thisUrl.hostname)) {
          this.censorMessage(savedMessage, `domain (\`${thisUrl.hostname}\`) not found in whitelist`);
          return;
        }

        if (domainBlacklist && domainBlacklist.includes(thisUrl.hostname)) {
          this.censorMessage(savedMessage, `domain (\`${thisUrl.hostname}\`) found in blacklist`);
          return;
        }
      }
    }

    // Filter tokens
    const blockedTokens =
      this.configValueForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id, "blocked_tokens") || [];
    for (const token of blockedTokens) {
      if (savedMessage.data.content.toLowerCase().includes(token.toLowerCase())) {
        this.censorMessage(savedMessage, `blocked token (\`${token}\`) found`);
        return;
      }
    }

    // Filter words
    const blockedWords =
      this.configValueForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id, "blocked_words") || [];
    for (const word of blockedWords) {
      const regex = new RegExp(`\\b${escapeStringRegexp(word)}\\b`, "i");
      if (regex.test(savedMessage.data.content)) {
        this.censorMessage(savedMessage, `blocked word (\`${word}\`) found`);
        return;
      }
    }

    // Filter regex
    const blockedRegex =
      this.configValueForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id, "blocked_regex") || [];
    for (const regexStr of blockedRegex) {
      const regex = new RegExp(regexStr, "i");
      if (regex.test(savedMessage.data.content)) {
        this.censorMessage(savedMessage, `blocked regex (\`${regexStr}\`) found`);
        return;
      }
    }
  }

  async onMessageCreate(savedMessage: SavedMessage) {
    if (savedMessage.is_bot) return;
    this.applyFiltersToMsg(savedMessage);
  }

  async onMessageUpdate(savedMessage: SavedMessage) {
    if (savedMessage.is_bot) return;
    this.applyFiltersToMsg(savedMessage);
  }
}
