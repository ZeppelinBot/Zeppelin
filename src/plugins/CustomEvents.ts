import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { IPluginOptions } from "knub";
import { Message, TextChannel, VoiceChannel } from "eris";
import { renderTemplate } from "../templateFormatter";
import { stripObjectToScalars } from "../utils";
import { CasesPlugin } from "./Cases";
import { CaseTypes } from "../data/CaseTypes";
import * as t from "io-ts";

// Triggers
const CommandTrigger = t.type({
  type: t.literal("command"),
  name: t.string,
  params: t.string,
  can_use: t.boolean,
});
type TCommandTrigger = t.TypeOf<typeof CommandTrigger>;

const AnyTrigger = CommandTrigger; // TODO: Make into a union once we have more triggers
type TAnyTrigger = t.TypeOf<typeof AnyTrigger>;

// Actions
const AddRoleAction = t.type({
  type: t.literal("add_role"),
  target: t.string,
  role: t.union([t.string, t.array(t.string)]),
});
type TAddRoleAction = t.TypeOf<typeof AddRoleAction>;

const CreateCaseAction = t.type({
  type: t.literal("create_case"),
  case_type: t.string,
  mod: t.string,
  target: t.string,
  reason: t.string,
});
type TCreateCaseAction = t.TypeOf<typeof CreateCaseAction>;

const MoveToVoiceChannelAction = t.type({
  type: t.literal("move_to_vc"),
  target: t.string,
  channel: t.string,
});
type TMoveToVoiceChannelAction = t.TypeOf<typeof MoveToVoiceChannelAction>;

const MessageAction = t.type({
  type: t.literal("message"),
  channel: t.string,
  content: t.string,
});
type TMessageAction = t.TypeOf<typeof MessageAction>;

const AnyAction = t.union([AddRoleAction, CreateCaseAction, MoveToVoiceChannelAction, MessageAction]);
type TAnyAction = t.TypeOf<typeof AnyAction>;

// Full config schema
const CustomEvent = t.type({
  name: t.string,
  trigger: AnyTrigger,
  actions: t.array(AnyAction),
});
type TCustomEvent = t.TypeOf<typeof CustomEvent>;

const ConfigSchema = t.type({
  events: t.record(t.string, CustomEvent),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

class ActionError extends Error {}

export class CustomEventsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "custom_events";
  public static showInDocs = false;
  public static dependencies = ["cases"];
  public static configSchema = ConfigSchema;

  private clearTriggers: () => void;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        events: {},
      },
    };
  }

  onLoad() {
    for (const [key, event] of Object.entries(this.getConfig().events)) {
      if (event.trigger.type === "command") {
        this.commands.add(
          event.trigger.name,
          event.trigger.params,
          (msg, args) => {
            const strippedMsg = stripObjectToScalars(msg, ["channel", "author"]);
            this.runEvent(event, { msg, args }, { args, msg: strippedMsg });
          },
          {
            requiredPermission: `events.${key}.trigger.can_use`,
            locks: [],
          },
        );
      }
    }
  }

  onUnload() {
    // TODO: Run this.clearTriggers() once we actually have something there
  }

  async runEvent(event: TCustomEvent, eventData: any, values: any) {
    try {
      for (const action of event.actions) {
        if (action.type === "add_role") {
          await this.addRoleAction(action, values, event, eventData);
        } else if (action.type === "create_case") {
          await this.createCaseAction(action, values, event, eventData);
        } else if (action.type === "move_to_vc") {
          await this.moveToVoiceChannelAction(action, values, event, eventData);
        } else if (action.type === "message") {
          await this.messageAction(action, values);
        }
      }
    } catch (e) {
      if (e instanceof ActionError) {
        if (event.trigger.type === "command") {
          this.sendErrorMessage((eventData.msg as Message).channel, e.message);
        } else {
          // TODO: Where to log action errors from other kinds of triggers?
        }

        return;
      }

      throw e;
    }
  }

  async addRoleAction(action: TAddRoleAction, values: any, event: TCustomEvent, eventData: any) {
    const targetId = await renderTemplate(action.target, values, false);
    const target = await this.getMember(targetId);
    if (!target) throw new ActionError(`Unknown target member: ${targetId}`);

    if (event.trigger.type === "command" && !this.canActOn((eventData.msg as Message).member, target)) {
      throw new ActionError("Missing permissions");
    }

    const rolesToAdd = Array.isArray(action.role) ? action.role : [action.role];
    await target.edit({
      roles: Array.from(new Set([...target.roles, ...rolesToAdd])),
    });
  }

  async createCaseAction(action: TCreateCaseAction, values: any, event: TCustomEvent, eventData: any) {
    const modId = await renderTemplate(action.mod, values, false);
    const targetId = await renderTemplate(action.target, values, false);

    const reason = await renderTemplate(action.reason, values, false);

    if (CaseTypes[action.case_type] == null) {
      throw new ActionError(`Invalid case type: ${action.type}`);
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    await casesPlugin.createCase({
      userId: targetId,
      modId,
      type: CaseTypes[action.case_type],
      reason: `__[${event.name}]__ ${reason}`,
    });
  }

  async moveToVoiceChannelAction(action: TMoveToVoiceChannelAction, values: any, event: TCustomEvent, eventData: any) {
    const targetId = await renderTemplate(action.target, values, false);
    const target = await this.getMember(targetId);
    if (!target) throw new ActionError("Unknown target member");

    if (event.trigger.type === "command" && !this.canActOn((eventData.msg as Message).member, target)) {
      throw new ActionError("Missing permissions");
    }

    const targetChannelId = await renderTemplate(action.channel, values, false);
    const targetChannel = this.guild.channels.get(targetChannelId);
    if (!targetChannel) throw new ActionError("Unknown target channel");
    if (!(targetChannel instanceof VoiceChannel)) throw new ActionError("Target channel is not a voice channel");

    if (!target.voiceState.channelID) return;
    await target.edit({
      channelID: targetChannel.id,
    });
  }

  async messageAction(action: TMessageAction, values: any) {
    const targetChannelId = await renderTemplate(action.channel, values, false);
    const targetChannel = this.guild.channels.get(targetChannelId);
    if (!targetChannel) throw new ActionError("Unknown target channel");
    if (!(targetChannel instanceof TextChannel)) throw new ActionError("Target channel is not a text channel");

    await targetChannel.createMessage({ content: action.content });
  }
}
