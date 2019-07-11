import { decorators as d, IPluginOptions, logger } from "knub";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { Member, Channel, GuildChannel, PermissionOverwrite, Permission, Message } from "eris";

// Permissions using these numbers: https://abal.moe/Eris/docs/reference (add all allowed/denied ones up)
interface ICompanionChannel {
  channelIds: string[];
  permissions: number;
}

interface ICompanionChannelMap {
  [channelId: string]: ICompanionChannel;
}

interface ICompanionChannelPluginConfig {
  channels: {
    [key: string]: ICompanionChannel;
  };
}

export class CompanionChannelPlugin extends ZeppelinPlugin<ICompanionChannelPluginConfig> {
  public static pluginName = "companion_channels";

  companionChannels: Map<string, ICompanionChannel> = new Map();

  getDefaultOptions(): IPluginOptions<ICompanionChannelPluginConfig> {
    return {
      config: {
        channels: {},
      },
    };
  }

  onLoad() {
    const tempCompanionChannels: ICompanionChannelMap = this.getConfig().channels;

    for (const [channelId, opts] of Object.entries(tempCompanionChannels)) {
      this.companionChannels.set(channelId, opts);
    }
  }

  onUnload() {
    this.companionChannels.clear();
  }

  async handleCompanionPermissions(userID: string, voiceChannelId: string, remove?: boolean) {
    if (this.companionChannels.has(voiceChannelId)) {
      const compChannels = this.companionChannels.get(voiceChannelId);
      compChannels.channelIds.forEach(textChannelId => {
        const textChannel = <GuildChannel>this.bot.getChannel(textChannelId);

        if (remove) {
          textChannel.deletePermission(userID, `Companion Channel for ${voiceChannelId} | User Left`);
        } else {
          textChannel.editPermission(
            userID,
            compChannels.permissions,
            0,
            "member",
            `Companion Channel for ${voiceChannelId} | User Joined`,
          );
        }
      });
    }
  }

  @d.event("voiceChannelJoin")
  onVoiceChannelJoin(member: Member, voiceChannel: Channel) {
    this.handleCompanionPermissions(member.id, voiceChannel.id);
  }

  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, newChannel: Channel, oldChannel: Channel) {
    this.handleCompanionPermissions(member.id, oldChannel.id, true);
    this.handleCompanionPermissions(member.id, newChannel.id);
  }

  @d.event("voiceChannelLeave")
  onVoiceChannelLeave(member: Member, voiceChannel: Channel) {
    this.handleCompanionPermissions(member.id, voiceChannel.id, true);
  }
}
