import { IPluginOptions } from "knub";
import { Invite } from "eris";
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
import { ZeppelinPlugin } from "./ZeppelinPlugin";

interface ICensorPluginConfig {
  filter_zalgo: boolean;
  filter_invites: boolean;
  invite_guild_whitelist: string[];
  invite_guild_blacklist: string[];
  invite_code_whitelist: string[];
  invite_code_blacklist: string[];
  allow_group_dm_invites: boolean;

  filter_domains: boolean;
  domain_whitelist: string[];
  domain_blacklist: string[];

  blocked_tokens: string[];
  blocked_words: string[];
  blocked_regex: string[];
}

export class CensorPlugin extends ZeppelinPlugin<ICensorPluginConfig> {
  public static pluginName = "censor";

  protected serverLogs: GuildLogs;
  protected savedMessages: GuildSavedMessages;

  private onMessageCreateFn;
  private onMessageUpdateFn;

  getDefaultOptions(): IPluginOptions<ICensorPluginConfig> {
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

  /**
   * Applies word censor filters to the message, if any apply.
   * @return {boolean} Indicates whether the message was removed
   */
  async applyFiltersToMsg(savedMessage: SavedMessage): Promise<boolean> {
    if (!savedMessage.data.content) return false;

    const config = this.getConfigForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id);

    // Filter zalgo
    const filterZalgo = config.filter_zalgo;
    if (filterZalgo) {
      const result = ZalgoRegex.exec(savedMessage.data.content);
      if (result) {
        this.censorMessage(savedMessage, "zalgo detected");
        return true;
      }
    }

    // Filter invites
    const filterInvites = config.filter_invites;
    if (filterInvites) {
      const inviteGuildWhitelist = config.invite_guild_whitelist;
      const inviteGuildBlacklist = config.invite_guild_blacklist;
      const inviteCodeWhitelist = config.invite_code_whitelist;
      const inviteCodeBlacklist = config.invite_code_blacklist;
      const allowGroupDMInvites = config.allow_group_dm_invites;

      const inviteCodes = getInviteCodesInString(savedMessage.data.content);

      let invites: Invite[] = await Promise.all(inviteCodes.map(code => this.bot.getInvite(code).catch(() => null)));

      invites = invites.filter(v => !!v);

      for (const invite of invites) {
        if (!invite.guild && !allowGroupDMInvites) {
          this.censorMessage(savedMessage, `group dm invites are not allowed`);
          return true;
        }

        if (inviteGuildWhitelist && !inviteGuildWhitelist.includes(invite.guild.id)) {
          this.censorMessage(
            savedMessage,
            `invite guild (**${invite.guild.name}** \`${invite.guild.id}\`) not found in whitelist`,
          );
          return true;
        }

        if (inviteGuildBlacklist && inviteGuildBlacklist.includes(invite.guild.id)) {
          this.censorMessage(
            savedMessage,
            `invite guild (**${invite.guild.name}** \`${invite.guild.id}\`) found in blacklist`,
          );
          return true;
        }

        if (inviteCodeWhitelist && !inviteCodeWhitelist.includes(invite.code)) {
          this.censorMessage(savedMessage, `invite code (\`${invite.code}\`) not found in whitelist`);
          return true;
        }

        if (inviteCodeBlacklist && inviteCodeBlacklist.includes(invite.code)) {
          this.censorMessage(savedMessage, `invite code (\`${invite.code}\`) found in blacklist`);
          return true;
        }
      }
    }

    // Filter domains
    const filterDomains = config.filter_domains;
    if (filterDomains) {
      const domainWhitelist = config.domain_whitelist;
      const domainBlacklist = config.domain_blacklist;

      const urls = getUrlsInString(savedMessage.data.content);
      for (const thisUrl of urls) {
        if (domainWhitelist && !domainWhitelist.includes(thisUrl.hostname)) {
          this.censorMessage(savedMessage, `domain (\`${thisUrl.hostname}\`) not found in whitelist`);
          return true;
        }

        if (domainBlacklist && domainBlacklist.includes(thisUrl.hostname)) {
          this.censorMessage(savedMessage, `domain (\`${thisUrl.hostname}\`) found in blacklist`);
          return true;
        }
      }
    }

    // Filter tokens
    const blockedTokens = config.blocked_tokens || [];
    for (const token of blockedTokens) {
      if (savedMessage.data.content.toLowerCase().includes(token.toLowerCase())) {
        this.censorMessage(savedMessage, `blocked token (\`${token}\`) found`);
        return true;
      }
    }

    // Filter words
    const blockedWords = config.blocked_words || [];
    for (const word of blockedWords) {
      const regex = new RegExp(`\\b${escapeStringRegexp(word)}\\b`, "i");
      if (regex.test(savedMessage.data.content)) {
        this.censorMessage(savedMessage, `blocked word (\`${word}\`) found`);
        return true;
      }
    }

    // Filter regex
    const blockedRegex = config.blocked_regex || [];
    for (const regexStr of blockedRegex) {
      const regex = new RegExp(regexStr, "i");
      if (regex.test(savedMessage.data.content)) {
        this.censorMessage(savedMessage, `blocked regex (\`${regexStr}\`) found`);
        return true;
      }
    }

    return false;
  }

  async onMessageCreate(savedMessage: SavedMessage) {
    if (savedMessage.is_bot) return;
    const lock = await this.locks.acquire(`message-${savedMessage.id}`);

    const wasDeleted = await this.applyFiltersToMsg(savedMessage);

    if (wasDeleted) {
      lock.interrupt();
    } else {
      lock.unlock();
    }
  }

  async onMessageUpdate(savedMessage: SavedMessage) {
    if (savedMessage.is_bot) return;
    const lock = await this.locks.acquire(`message-${savedMessage.id}`);

    const wasDeleted = await this.applyFiltersToMsg(savedMessage);

    if (wasDeleted) {
      lock.interrupt();
    } else {
      lock.unlock();
    }
  }
}
