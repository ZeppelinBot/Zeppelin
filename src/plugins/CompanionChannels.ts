import { decorators as d, IPluginOptions, logger } from "knub";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { Member, Channel, GuildChannel, PermissionOverwrite, Permission, Message, TextChannel } from "eris";
import * as t from "io-ts";
import { tNullable } from "../utils";

// Permissions using these numbers: https://abal.moe/Eris/docs/reference (add all allowed/denied ones up)
const CompanionChannelOpts = t.type({
  voice_channel_ids: t.array(t.string),
  text_channel_ids: t.array(t.string),
  permissions: t.number,
  enabled: tNullable(t.boolean),
});
type TCompanionChannelOpts = t.TypeOf<typeof CompanionChannelOpts>;

const ConfigSchema = t.type({
  entries: t.record(t.string, CompanionChannelOpts),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

interface ICompanionChannelMap {
  [channelId: string]: TCompanionChannelOpts;
}

const defaultCompanionChannelOpts: Partial<TCompanionChannelOpts> = {
  enabled: true,
};

export class CompanionChannelPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "companion_channels";
  protected static configSchema = ConfigSchema;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        entries: {},
      },
    };
  }

  /**
   * Returns an array of companion channel opts that match the given userId and voiceChannelId,
   * with default companion channel opts applied as well
   */
  protected getCompanionChannelOptsForVoiceChannelId(userId, voiceChannelId): TCompanionChannelOpts[] {
    const config = this.getConfigForMemberIdAndChannelId(userId, voiceChannelId);
    return Object.values(config.entries)
      .filter(opts => opts.voice_channel_ids.includes(voiceChannelId))
      .map(opts => Object.assign({}, defaultCompanionChannelOpts, opts));
  }

  async handleCompanionPermissions(userId: string, voiceChannelId?: string, oldChannelId?: string) {
    const permsToDelete: Set<string> = new Set(); // channelId[]
    const oldPerms: Map<string, number> = new Map(); // channelId => permissions
    const permsToSet: Map<string, number> = new Map(); // channelId => permissions

    const oldChannelOptsArr: TCompanionChannelOpts[] = oldChannelId
      ? this.getCompanionChannelOptsForVoiceChannelId(userId, oldChannelId)
      : [];
    const newChannelOptsArr: TCompanionChannelOpts[] = voiceChannelId
      ? this.getCompanionChannelOptsForVoiceChannelId(userId, voiceChannelId)
      : [];

    for (const oldChannelOpts of oldChannelOptsArr) {
      for (const channelId of oldChannelOpts.text_channel_ids) {
        oldPerms.set(channelId, oldChannelOpts.permissions);
        permsToDelete.add(channelId);
      }
    }

    for (const newChannelOpts of newChannelOptsArr) {
      for (const channelId of newChannelOpts.text_channel_ids) {
        if (oldPerms.get(channelId) !== newChannelOpts.permissions) {
          // Update text channel perms if the channel we transitioned from didn't already have the same text channel perms
          permsToSet.set(channelId, newChannelOpts.permissions);
        }
        if (permsToDelete.has(channelId)) {
          permsToDelete.delete(channelId);
        }
      }
    }

    for (const channelId of permsToDelete) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;
      channel.deletePermission(userId, `Companion Channel for ${oldChannelId} | User Left`);
    }

    for (const [channelId, permissions] of permsToSet) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;
      channel.editPermission(userId, permissions, 0, "member", `Companion Channel for ${voiceChannelId} | User Joined`);
    }
  }

  @d.event("voiceChannelJoin")
  onVoiceChannelJoin(member: Member, voiceChannel: Channel) {
    this.handleCompanionPermissions(member.id, voiceChannel.id);
  }

  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, newChannel: Channel, oldChannel: Channel) {
    this.handleCompanionPermissions(member.id, newChannel.id, oldChannel.id);
  }

  @d.event("voiceChannelLeave")
  onVoiceChannelLeave(member: Member, voiceChannel: Channel) {
    this.handleCompanionPermissions(member.id, null, voiceChannel.id);
  }
}
