import { Message, MessageContent, MessageFile, TextableChannel, TextChannel } from "eris";
import { GuildCases } from "../data/GuildCases";
import { CaseTypes } from "../data/CaseTypes";
import { Case } from "../data/entities/Case";
import moment from "moment-timezone";
import { CaseTypeColors } from "../data/CaseTypeColors";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildActions } from "../data/GuildActions";
import { GuildArchives } from "../data/GuildArchives";

export class CasesPlugin extends ZeppelinPlugin {
  public static pluginName = "cases";

  protected actions: GuildActions;
  protected cases: GuildCases;
  protected archives: GuildArchives;

  getDefaultOptions() {
    return {
      config: {
        log_automatic_actions: true,
        case_log_channel: null
      }
    };
  }

  onLoad() {
    this.actions = GuildActions.getInstance(this.guildId);
    this.cases = GuildCases.getInstance(this.guildId);
    this.archives = GuildArchives.getInstance(this.guildId);

    this.actions.register("createCase", args => {
      return this.createCase(
        args.userId,
        args.modId,
        args.type,
        args.auditLogId,
        args.reason,
        args.automatic,
        args.postInCaseLog
      );
    });

    this.actions.register("createCaseNote", (caseOrCaseId, args) => {
      return this.createCaseNote(caseOrCaseId, args.modId, args.note, args.automatic, args.postInCaseLog);
    });

    this.actions.register("postCase", async args => {
      const embed = await this.getCaseEmbed(args.case || args.caseId);
      return (args.channel as TextableChannel).createMessage(embed);
    });
  }

  onUnload() {
    this.actions.unregister("createCase");
    this.actions.unregister("createCaseNote");
    this.actions.unregister("postCase");
  }

  protected resolveCaseId(caseOrCaseId: Case | number): number {
    return caseOrCaseId instanceof Case ? caseOrCaseId.id : caseOrCaseId;
  }

  /**
   * Creates a new case and, depending on config, posts it in the case log channel
   * @return {Number} The ID of the created case
   */
  public async createCase(
    userId: string,
    modId: string,
    type: CaseTypes,
    auditLogId: string = null,
    reason: string = null,
    automatic = false,
    postInCaseLogOverride = null
  ): Promise<Case> {
    const user = this.bot.users.get(userId);
    const userName = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";

    const mod = this.bot.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : "Unknown#0000";

    const createdCase = await this.cases.create({
      type,
      user_id: userId,
      user_name: userName,
      mod_id: modId,
      mod_name: modName,
      audit_log_id: auditLogId
    });

    if (reason) {
      await this.createCaseNote(createdCase, modId, reason, automatic, false);
    }

    if (
      this.configValue("case_log_channel") &&
      (!automatic || this.configValue("log_automatic_actions")) &&
      postInCaseLogOverride !== false
    ) {
      try {
        await this.postCaseToCaseLogChannel(createdCase);
      } catch (e) {} // tslint:disable-line
    }

    return createdCase;
  }

  /**
   * Adds a case note to an existing case and, depending on config, posts the updated case in the case log channel
   */
  public async createCaseNote(
    caseOrCaseId: Case | number,
    modId: string,
    body: string,
    automatic = false,
    postInCaseLogOverride = null
  ): Promise<void> {
    const mod = this.bot.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : "Unknown#0000";

    const theCase = await this.cases.find(this.resolveCaseId(caseOrCaseId));
    if (!theCase) {
      this.throwPluginRuntimeError(`Unknown case ID: ${caseOrCaseId}`);
    }

    await this.cases.createNote(theCase.id, {
      mod_id: modId,
      mod_name: modName,
      body: body || ""
    });

    if (theCase.mod_id == null) {
      // If the case has no moderator information, assume the first one to add a note to it did the action
      await this.cases.update(theCase.id, {
        mod_id: modId,
        mod_name: modName
      });
    }

    const archiveLinkMatch = body && body.match(/\/archives\/([a-zA-Z0-9\-]+)/);
    if (archiveLinkMatch) {
      const archiveId = archiveLinkMatch[1];
      this.archives.makePermanent(archiveId);
    }

    if ((!automatic || this.configValue("log_automatic_actions")) && postInCaseLogOverride !== false) {
      try {
        await this.postCaseToCaseLogChannel(theCase.id);
      } catch (e) {} // tslint:disable-line
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
        text: `Case created at ${createdAt.format("YYYY-MM-DD [at] HH:mm")}`
      },
      fields: [
        {
          name: "User",
          value: `${theCase.user_name}\n<@!${theCase.user_id}>`,
          inline: true
        },
        {
          name: "Moderator",
          value: `${theCase.mod_name}\n<@!${theCase.mod_id}>`,
          inline: true
        }
      ]
    };

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
          value: note.body
        });
      });
    } else {
      embed.fields.push({
        name: "!!! THIS CASE HAS NO NOTES !!!",
        value: "\u200B"
      });
    }

    return { embed };
  }

  /**
   * A helper for posting to the case log channel.
   * Returns silently if the case log channel isn't specified or is invalid.
   */
  public postToCaseLogChannel(content: MessageContent, file: MessageFile = null): Promise<Message> {
    const caseLogChannelId = this.configValue("case_log_channel");
    if (!caseLogChannelId) return;

    const caseLogChannel = this.guild.channels.get(caseLogChannelId);
    if (!caseLogChannel || !(caseLogChannel instanceof TextChannel)) return;

    return caseLogChannel.createMessage(content, file);
  }

  /**
   * A helper to post a case embed to the case log channel
   */
  public async postCaseToCaseLogChannel(caseOrCaseId: Case | number): Promise<Message> {
    const caseEmbed = await this.getCaseEmbed(caseOrCaseId);
    if (!caseEmbed) return;

    return this.postToCaseLogChannel(caseEmbed);
  }
}
