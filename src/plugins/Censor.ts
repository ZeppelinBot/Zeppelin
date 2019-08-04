import { IPluginOptions, logger } from "knub";
import { Invite, Embed } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import {
  deactivateMentions,
  disableCodeBlocks,
  getInviteCodesInString,
  getUrlsInString,
  stripObjectToScalars,
  tNullable,
} from "../utils";
import { ZalgoRegex } from "../data/Zalgo";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import cloneDeep from "lodash.clonedeep";
import * as t from "io-ts";
import { TSafeRegex } from "../validatorUtils";

const ConfigSchema = t.type({
  filter_zalgo: t.boolean,
  filter_invites: t.boolean,
  invite_guild_whitelist: tNullable(t.array(t.string)),
  invite_guild_blacklist: tNullable(t.array(t.string)),
  invite_code_whitelist: tNullable(t.array(t.string)),
  invite_code_blacklist: tNullable(t.array(t.string)),
  allow_group_dm_invites: t.boolean,
  filter_domains: t.boolean,
  domain_whitelist: tNullable(t.array(t.string)),
  domain_blacklist: tNullable(t.array(t.string)),
  blocked_tokens: tNullable(t.array(t.string)),
  blocked_words: tNullable(t.array(t.string)),
  blocked_regex: tNullable(t.array(TSafeRegex)),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class CensorPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "censor";
  protected static configSchema = ConfigSchema;

  protected serverLogs: GuildLogs;
  protected savedMessages: GuildSavedMessages;

  private onMessageCreateFn;
  private onMessageUpdateFn;

  protected static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
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
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);

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

    const user = await this.resolveUser(savedMessage.user_id);
    const channel = this.guild.channels.get(savedMessage.channel_id);

    this.serverLogs.log(LogType.CENSOR, {
      user: stripObjectToScalars(user),
      channel: stripObjectToScalars(channel),
      reason,
      message: savedMessage,
      messageText: disableCodeBlocks(deactivateMentions(savedMessage.data.content)),
    });
  }

  /**
   * Applies word censor filters to the message, if any apply.
   * @return {boolean} Indicates whether the message was removed
   */
  async applyFiltersToMsg(savedMessage: SavedMessage): Promise<boolean> {
    const config = this.getConfigForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id);

    let messageContent = savedMessage.data.content || "";
    if (savedMessage.data.attachments) messageContent += " " + JSON.stringify(savedMessage.data.attachments);
    if (savedMessage.data.embeds) {
      const embeds = (savedMessage.data.embeds as Embed[]).map(e => cloneDeep(e));
      for (const embed of embeds) {
        if (embed.type === "video") {
          // Ignore video descriptions as they're not actually shown on the embed
          delete embed.description;
        }
      }

      messageContent += " " + JSON.stringify(embeds);
    }

    // Filter zalgo
    const filterZalgo = config.filter_zalgo;
    if (filterZalgo) {
      const result = ZalgoRegex.exec(messageContent);
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

      const inviteCodes = getInviteCodesInString(messageContent);

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

      const urls = getUrlsInString(messageContent);
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
      if (messageContent.toLowerCase().includes(token.toLowerCase())) {
        this.censorMessage(savedMessage, `blocked token (\`${token}\`) found`);
        return true;
      }
    }

    // Filter words
    const blockedWords = config.blocked_words || [];
    for (const word of blockedWords) {
      const regex = new RegExp(`\\b${escapeStringRegexp(word)}\\b`, "i");
      if (regex.test(messageContent)) {
        this.censorMessage(savedMessage, `blocked word (\`${word}\`) found`);
        return true;
      }
    }

    // Filter regex
    const blockedRegex: RegExp[] = config.blocked_regex || [];
    for (const [i, regex] of blockedRegex.entries()) {
      if (typeof regex.test !== "function") {
        logger.info(
          `[DEBUG] Regex <${regex}> was not a regex; index ${i} of censor.blocked_regex for guild ${this.guild.name} (${
            this.guild.id
          })`,
        );
        continue;
      }

      // We're testing both the original content and content + attachments/embeds here so regexes that use ^ and $ still match the regular content properly
      if (regex.test(savedMessage.data.content) || regex.test(messageContent)) {
        this.censorMessage(savedMessage, `blocked regex (\`${regex.source}\`) found`);
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
