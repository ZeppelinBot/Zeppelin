import { decorators as d, Plugin } from "knub";
import { Invite, Message } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { getInviteCodesInString, getUrlsInString, stripObjectToScalars } from "../utils";

export class CensorPlugin extends Plugin {
  protected serverLogs: GuildLogs;

  getDefaultOptions() {
    return {
      config: {
        filter_invites: false,
        invite_guild_whitelist: null,
        invite_guild_blacklist: null,
        invite_code_whitelist: null,
        invite_code_blacklist: null,

        filter_domains: false,
        domain_whitelist: null,
        domain_blacklist: null,

        blocked_tokens: null,
        blocked_words: null,
        blocked_regex: null
      },

      overrides: [
        {
          level: ">=50",
          config: {
            filter_invites: false,
            filter_domains: false,
            blocked_tokens: null,
            blocked_words: null,
            blocked_regex: null
          }
        }
      ]
    };
  }

  onLoad() {
    this.serverLogs = new GuildLogs(this.guildId);
  }

  async censorMessage(msg: Message, reason: string) {
    this.serverLogs.ignoreLog(LogType.MESSAGE_DELETE, msg.id);

    try {
      await msg.delete("Censored");
    } catch (e) {
      return;
    }

    this.serverLogs.log(LogType.CENSOR, {
      member: stripObjectToScalars(msg.member, ["user"]),
      channel: stripObjectToScalars(msg.channel),
      reason,
      messageText: msg.cleanContent
    });
  }

  async applyFiltersToMsg(msg: Message) {
    if (!msg.author || msg.author.bot) return;
    if (msg.type !== 0) return;
    if (!msg.content) return;

    // Filter invites
    if (this.configValueForMsg(msg, "filter_invites")) {
      const inviteGuildWhitelist: string[] = this.configValueForMsg(msg, "invite_guild_whitelist");
      const inviteGuildBlacklist: string[] = this.configValueForMsg(msg, "invite_guild_blacklist");
      const inviteCodeWhitelist: string[] = this.configValueForMsg(msg, "invite_code_whitelist");
      const inviteCodeBlacklist: string[] = this.configValueForMsg(msg, "invite_code_blacklist");

      const inviteCodes = getInviteCodesInString(msg.content);

      const invites: Invite[] = await Promise.all(
        inviteCodes.map(code => this.bot.getInvite(code))
      );

      for (const invite of invites) {
        if (inviteGuildWhitelist && !inviteGuildWhitelist.includes(invite.guild.id)) {
          this.censorMessage(
            msg,
            `invite guild (**${invite.guild.name}** \`${invite.guild.id}\`) not found in whitelist`
          );
          return;
        }

        if (inviteGuildBlacklist && inviteGuildBlacklist.includes(invite.guild.id)) {
          this.censorMessage(
            msg,
            `invite guild (**${invite.guild.name}** \`${invite.guild.id}\`) found in blacklist`
          );
          return;
        }

        if (inviteCodeWhitelist && !inviteCodeWhitelist.includes(invite.code)) {
          this.censorMessage(msg, `invite code (\`${invite.code}\`) not found in whitelist`);
          return;
        }

        if (inviteCodeBlacklist && inviteCodeBlacklist.includes(invite.code)) {
          this.censorMessage(msg, `invite code (\`${invite.code}\`) found in blacklist`);
          return;
        }
      }
    }

    // Filter domains
    if (this.configValueForMsg(msg, "filter_domains")) {
      const domainWhitelist: string[] = this.configValueForMsg(msg, "domain_whitelist");
      const domainBlacklist: string[] = this.configValueForMsg(msg, "domain_blacklist");

      const urls = getUrlsInString(msg.content);
      for (const thisUrl of urls) {
        if (domainWhitelist && !domainWhitelist.includes(thisUrl.hostname)) {
          this.censorMessage(msg, `domain (\`${thisUrl.hostname}\`) not found in whitelist`);
          return;
        }

        if (domainBlacklist && domainBlacklist.includes(thisUrl.hostname)) {
          this.censorMessage(msg, `domain (\`${thisUrl.hostname}\`) found in blacklist`);
          return;
        }
      }
    }

    // Filter tokens
    const blockedTokens = this.configValueForMsg(msg, "blocked_tokens") || [];
    for (const token of blockedTokens) {
      if (msg.content.includes(token)) {
        this.censorMessage(msg, `blocked token (\`${token}\`) found`);
        return;
      }
    }

    // Filter words
    const blockedWords = this.configValueForMsg(msg, "blocked_words") || [];
    for (const word of blockedWords) {
      const regex = new RegExp(`\\b${escapeStringRegexp(word)}\\b`, "i");
      if (regex.test(msg.content)) {
        this.censorMessage(msg, `blocked word (\`${word}\`) found`);
        return;
      }
    }

    // Filter regex
    const blockedRegex = this.configValueForMsg(msg, "blocked_regex") || [];
    for (const regexStr of blockedRegex) {
      const regex = new RegExp(regexStr);
      if (regex.test(msg.content)) {
        this.censorMessage(msg, `blocked regex (\`${regexStr}\`) found`);
        return;
      }
    }
  }

  @d.event("messageCreate")
  async onMessageCreate(msg: Message) {
    this.applyFiltersToMsg(msg);
  }

  @d.event("messageUpdate")
  async onMessageUpdate(msg: Message) {
    this.applyFiltersToMsg(msg);
  }
}
