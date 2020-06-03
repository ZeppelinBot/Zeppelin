import { Message, MessageContent, MessageFile, TextChannel } from "eris";
import { GuildCases } from "../data/GuildCases";
import { CaseTypes } from "../data/CaseTypes";
import { Case } from "../data/entities/Case";
import moment from "moment-timezone";
import { CaseTypeColors } from "../data/CaseTypeColors";
import { PluginInfo, trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildArchives } from "../data/GuildArchives";
import { IPluginOptions, logger } from "knub";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import * as t from "io-ts";
import { isDiscordRESTError, tNullable } from "../utils";
import { ERRORS } from "../RecoverablePluginError";

const ConfigSchema = t.type({
  log_automatic_actions: t.boolean,
  case_log_channel: tNullable(t.string),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

/**
 * Can also be used as a config object for functions that create cases
 */
export type CaseArgs = {
  userId: string;
  modId: string;
  ppId?: string;
  type: CaseTypes;
  auditLogId?: string;
  reason?: string;
  automatic?: boolean;
  postInCaseLogOverride?: boolean;
  noteDetails?: string[];
  extraNotes?: string[];
};

export type CaseNoteArgs = {
  caseId: number;
  modId: string;
  body: string;
  automatic?: boolean;
  postInCaseLogOverride?: boolean;
  noteDetails?: string[];
};

export class CasesPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "cases";
  public static configSchema = ConfigSchema;

  public static pluginInfo: PluginInfo = {
    prettyName: "Cases",
    description: trimPluginDescription(`
      This plugin contains basic configuration for cases created by other plugins
    `),
  };

  protected cases: GuildCases;
  protected archives: GuildArchives;
  protected logs: GuildLogs;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        log_automatic_actions: true,
        case_log_channel: null,
      },
    };
  }

  onLoad() {
    this.cases = GuildCases.getGuildInstance(this.guildId);
    this.archives = GuildArchives.getGuildInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);
  }

  protected resolveCaseId(caseOrCaseId: Case | number): number {
    return caseOrCaseId instanceof Case ? caseOrCaseId.id : caseOrCaseId;
  }

  /**
   * Creates a new case and, depending on config, posts it in the case log channel
   */
  public async createCase(args: CaseArgs): Promise<Case> {
    const user = await this.resolveUser(args.userId);
    const userName = `${user.username}#${user.discriminator}`;

    const mod = await this.resolveUser(args.modId);
    const modName = `${mod.username}#${mod.discriminator}`;

    let ppName = null;
    if (args.ppId) {
      const pp = await this.resolveUser(args.ppId);
      ppName = `${pp.username}#${pp.discriminator}`;
    }

    if (args.auditLogId) {
      const existingAuditLogCase = await this.cases.findByAuditLogId(args.auditLogId);
      if (existingAuditLogCase) {
        delete args.auditLogId;
        logger.warn(`Duplicate audit log ID for mod case: ${args.auditLogId}`);
      }
    }

    const createdCase = await this.cases.create({
      type: args.type,
      user_id: args.userId,
      user_name: userName,
      mod_id: args.modId,
      mod_name: modName,
      audit_log_id: args.auditLogId,
      pp_id: args.ppId,
      pp_name: ppName,
    });

    if (args.reason || (args.noteDetails && args.noteDetails.length)) {
      await this.createCaseNote({
        caseId: createdCase.id,
        modId: args.modId,
        body: args.reason || "",
        automatic: args.automatic,
        postInCaseLogOverride: false,
        noteDetails: args.noteDetails,
      });
    }

    if (args.extraNotes) {
      for (const extraNote of args.extraNotes) {
        await this.createCaseNote({
          caseId: createdCase.id,
          modId: args.modId,
          body: extraNote,
          automatic: args.automatic,
          postInCaseLogOverride: false,
        });
      }
    }

    const config = this.getConfig();

    if (
      config.case_log_channel &&
      (!args.automatic || config.log_automatic_actions) &&
      args.postInCaseLogOverride !== false
    ) {
      await this.postCaseToCaseLogChannel(createdCase);
    }

    return createdCase;
  }

  /**
   * Adds a case note to an existing case and, depending on config, posts the updated case in the case log channel
   */
  public async createCaseNote(args: CaseNoteArgs): Promise<void> {
    const theCase = await this.cases.find(this.resolveCaseId(args.caseId));
    if (!theCase) {
      this.throwRecoverablePluginError(ERRORS.UNKNOWN_NOTE_CASE);
    }

    const mod = await this.resolveUser(args.modId);
    const modName = `${mod.username}#${mod.discriminator}`;

    let body = args.body;

    // Add note details to the beginning of the note
    if (args.noteDetails && args.noteDetails.length) {
      body = args.noteDetails.map(d => `__[${d}]__`).join(" ") + " " + body;
    }

    await this.cases.createNote(theCase.id, {
      mod_id: mod.id,
      mod_name: modName,
      body: body || "",
    });

    if (theCase.mod_id == null) {
      // If the case has no moderator information, assume the first one to add a note to it did the action
      await this.cases.update(theCase.id, {
        mod_id: mod.id,
        mod_name: modName,
      });
    }

    const archiveLinkMatch = body && body.match(/(?<=\/archives\/)[a-zA-Z0-9\-]+/g);
    if (archiveLinkMatch) {
      for (const archiveId of archiveLinkMatch) {
        this.archives.makePermanent(archiveId);
      }
    }

    if ((!args.automatic || this.getConfig().log_automatic_actions) && args.postInCaseLogOverride !== false) {
      await this.postCaseToCaseLogChannel(theCase.id);
    }
  }

  /**
   * Returns a Discord embed for the specified case
   */
  public async getCaseEmbed(caseOrCaseId: Case | number): Promise<MessageContent> {
    const theCase = await this.cases.with("notes").find(this.resolveCaseId(caseOrCaseId));
    if (!theCase) return null;

    const createdAt = moment(theCase.created_at);
    const actionTypeStr = CaseTypes[theCase.type].toUpperCase();

    const embed: any = {
      title: `${actionTypeStr} - Case #${theCase.case_number}`,
      footer: {
        text: `Case created at ${createdAt.format("YYYY-MM-DD [at] HH:mm")}`,
      },
      fields: [
        {
          name: "User",
          value: `${theCase.user_name}\n<@!${theCase.user_id}>`,
          inline: true,
        },
        {
          name: "Moderator",
          value: `${theCase.mod_name}\n<@!${theCase.mod_id}>`,
          inline: true,
        },
      ],
    };

    if (theCase.pp_id) {
      embed.fields[1].value += `\np.p. ${theCase.pp_name}\n<@!${theCase.pp_id}>`;
    }

    if (theCase.is_hidden) {
      embed.title += " (hidden)";
    }

    if (CaseTypeColors[theCase.type]) {
      embed.color = CaseTypeColors[theCase.type];
    }

    if (theCase.notes.length) {
      theCase.notes.forEach((note: any) => {
        const noteDate = moment(note.created_at);
        embed.fields.push({
          name: `${note.mod_name} at ${noteDate.format("YYYY-MM-DD [at] HH:mm")}:`,
          value: note.body,
        });
      });
    } else {
      embed.fields.push({
        name: "!!! THIS CASE HAS NO NOTES !!!",
        value: "\u200B",
      });
    }

    return { embed };
  }

  public async getCaseTypeAmountForUserId(userID: string, type: CaseTypes): Promise<number> {
    const cases = (await this.cases.getByUserId(userID)).filter(c => !c.is_hidden);
    let typeAmount = 0;

    if (cases.length > 0) {
      cases.forEach(singleCase => {
        if (singleCase.type === type.valueOf()) {
          typeAmount++;
        }
      });
    }

    return typeAmount;
  }

  /**
   * A helper for posting to the case log channel.
   * Returns silently if the case log channel isn't specified or is invalid.
   */
  public async postToCaseLogChannel(content: MessageContent, file: MessageFile = null): Promise<Message> {
    const caseLogChannelId = this.getConfig().case_log_channel;
    if (!caseLogChannelId) return;

    const caseLogChannel = this.guild.channels.get(caseLogChannelId);
    if (!caseLogChannel || !(caseLogChannel instanceof TextChannel)) return;

    let result;
    try {
      result = await caseLogChannel.createMessage(content, file);
    } catch (e) {
      if (isDiscordRESTError(e) && e.code === 50013) {
        logger.warn(
          `Missing permissions to post mod cases in <#${caseLogChannel.id}> in guild ${this.guild.name} (${this.guild.id})`,
        );
        this.logs.log(LogType.BOT_ALERT, {
          body: `Missing permissions to post mod cases in <#${caseLogChannel.id}>`,
        });
        return;
      }

      throw e;
    }

    return result;
  }

  /**
   * A helper to post a case embed to the case log channel
   */
  public async postCaseToCaseLogChannel(caseOrCaseId: Case | number): Promise<Message> {
    const theCase = await this.cases.find(this.resolveCaseId(caseOrCaseId));
    if (!theCase) return;

    const caseEmbed = await this.getCaseEmbed(caseOrCaseId);
    if (!caseEmbed) return;

    try {
      return this.postToCaseLogChannel(caseEmbed);
    } catch (e) {
      this.logs.log(LogType.BOT_ALERT, {
        body: `Failed to post case #${theCase.case_number} to the case log channel`,
      });
      return null;
    }
  }
}
