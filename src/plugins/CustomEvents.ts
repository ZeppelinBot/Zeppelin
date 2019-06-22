import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { IPluginOptions } from "knub";
import { Message, TextChannel, VoiceChannel } from "eris";
import { renderTemplate } from "../templateFormatter";
import { stripObjectToScalars } from "../utils";
import { CasesPlugin } from "./Cases";
import { CaseTypes } from "../data/CaseTypes";

// Triggers
type CommandTrigger = {
  type: "command";
  name: string;
  params: string;
  can_use: boolean;
};

type AnyTrigger = CommandTrigger;

// Actions
type AddRoleAction = {
  type: "add_role";
  target: string;
  role: string | string[];
};

type CreateCaseAction = {
  type: "create_case";
  case_type: string;
  mod: string;
  target: string;
  reason: string;
};

type MoveToVoiceChannelAction = {
  type: "move_to_vc";
  target: string;
  channel: string;
};

type MessageAction = {
  type: "message";
  channel: string;
  content: string;
};

type AnyAction = AddRoleAction | CreateCaseAction | MoveToVoiceChannelAction | MessageAction;

// Event
type CustomEvent = {
  name: string;
  trigger: AnyTrigger;
  actions: AnyAction[];
};

interface ICustomEventsPluginConfig {
  events: {
    [key: string]: CustomEvent;
  };
}

class ActionError extends Error {}

export class CustomEventsPlugin extends ZeppelinPlugin<ICustomEventsPluginConfig> {
  public static pluginName = "custom_events";
  private clearTriggers: () => void;

  public static dependencies = ["cases"];

  getDefaultOptions(): IPluginOptions<ICustomEventsPluginConfig> {
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

  async runEvent(event: CustomEvent, eventData: any, values: any) {
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

  async addRoleAction(action: AddRoleAction, values: any, event: CustomEvent, eventData: any) {
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

  async createCaseAction(action: CreateCaseAction, values: any, event: CustomEvent, eventData: any) {
    const modId = await renderTemplate(action.mod, values, false);
    const targetId = await renderTemplate(action.target, values, false);

    const reason = await renderTemplate(action.reason, values, false);

    if (CaseTypes[action.case_type] == null) {
      throw new ActionError(`Invalid case type: ${action.type}`);
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    await casesPlugin.createCase({
      userId: targetId,
      modId: modId,
      type: CaseTypes[action.case_type],
      reason: `__[${event.name}]__ ${reason}`,
    });
  }

  async moveToVoiceChannelAction(action: MoveToVoiceChannelAction, values: any, event: CustomEvent, eventData: any) {
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

  async messageAction(action: MessageAction, values: any) {
    const targetChannelId = await renderTemplate(action.channel, values, false);
    const targetChannel = this.guild.channels.get(targetChannelId);
    if (!targetChannel) throw new ActionError("Unknown target channel");
    if (!(targetChannel instanceof TextChannel)) throw new ActionError("Target channel is not a text channel");

    await targetChannel.createMessage({ content: action.content });
  }
}
