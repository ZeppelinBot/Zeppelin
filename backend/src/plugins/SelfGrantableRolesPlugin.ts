import { decorators as d, IPluginOptions } from "knub";
import { GuildChannel, Message, Role, TextChannel } from "eris";
import { asSingleLine, chunkArray, errorMessage, sorter, successMessage, tDeepPartial, trimLines } from "../utils";
import { trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";

const RoleMap = t.record(t.string, t.array(t.string));

const SelfGrantableRoleEntry = t.type({
  roles: RoleMap,
  can_use: t.boolean,
  can_ignore_cooldown: t.boolean,
  max_roles: t.number,
});
const PartialRoleEntry = t.partial(SelfGrantableRoleEntry.props);
type TSelfGrantableRoleEntry = t.TypeOf<typeof SelfGrantableRoleEntry>;

const ConfigSchema = t.type({
  entries: t.record(t.string, SelfGrantableRoleEntry),
  mention_roles: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const PartialConfigSchema = tDeepPartial(ConfigSchema);

const defaultSelfGrantableRoleEntry: t.TypeOf<typeof PartialRoleEntry> = {
  can_use: false,
  can_ignore_cooldown: false,
  max_roles: 0,
};

export class SelfGrantableRolesPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "self_grantable_roles";
  public static showInDocs = true;
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Self-grantable roles",
    description: trimPluginDescription(`
      Allows users to grant themselves roles via a command
    `),
    configurationGuide: trimPluginDescription(`
      ### Basic configuration
      In this example, users can add themselves platform roles on the channel 473087035574321152 by using the
      \`!role\` command. For example, \`!role pc ps4\` to add both the "pc" and "ps4" roles as specified below.
      
      ~~~yml
      self_grantable_roles:
        config:
          entries:
            basic:
              roles:
                "543184300250759188": ["pc", "computer"]
                "534710505915547658": ["ps4", "ps", "playstation"]
                "473085927053590538": ["xbox", "xb1", "xb"]
        overrides:
          - channel: "473087035574321152"
            config:
              entries:
                basic:
                  roles:
                    can_use: true
      ~~~
      
      ### Maximum number of roles
      This is identical to the basic example above, but users can only choose 1 role.
      
      ~~~yml
      self_grantable_roles:
        config:
          entries:
            basic:
              roles:
                "543184300250759188": ["pc", "computer"]
                "534710505915547658": ["ps4", "ps", "playstation"]
                "473085927053590538": ["xbox", "xb1", "xb"]
              max_roles: 1
        overrides:
          - channel: "473087035574321152"
            config:
              entries:
                basic:
                  roles:
                    can_use: true
      ~~~
    `),
  };

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        entries: {},
        mention_roles: false,
      },
    };
  }

  protected static preprocessStaticConfig(config: t.TypeOf<typeof PartialConfigSchema>) {
    for (const [key, entry] of Object.entries(config.entries)) {
      // Apply default entry config
      config.entries[key] = { ...defaultSelfGrantableRoleEntry, ...entry };

      // Normalize alias names
      if (entry.roles) {
        for (const [roleId, aliases] of Object.entries(entry.roles)) {
          entry.roles[roleId] = aliases.map(a => a.toLowerCase());
        }
      }
    }

    return config;
  }

  protected splitRoleNames(roleNames: string[]) {
    return roleNames
      .map(v => v.split(/[\s,]+/))
      .flat()
      .filter(Boolean);
  }

  protected normalizeRoleNames(roleNames: string[]) {
    return roleNames.map(v => v.toLowerCase());
  }

  protected getApplyingEntries(msg): TSelfGrantableRoleEntry[] {
    const config = this.getConfigForMsg(msg);
    return Object.entries(config.entries)
      .filter(
        ([k, e]) => e.can_use && !(!e.can_ignore_cooldown && this.cooldowns.isOnCooldown(`${k}:${msg.author.id}`)),
      )
      .map(pair => pair[1]);
  }

  protected findMatchingRoles(roleNames, entries: TSelfGrantableRoleEntry[]): string[] {
    const aliasToRoleId = entries.reduce((map, entry) => {
      for (const [roleId, aliases] of Object.entries(entry.roles)) {
        for (const alias of aliases) {
          map.set(alias, roleId);
        }
      }

      return map;
    }, new Map());

    return roleNames.map(roleName => aliasToRoleId.get(roleName)).filter(Boolean);
  }

  @d.command("role help", [], {
    aliases: ["role"],
  })
  async roleHelpCmd(msg: Message) {
    const applyingEntries = this.getApplyingEntries(msg);
    if (applyingEntries.length === 0) return;

    const allPrimaryAliases = [];
    for (const entry of applyingEntries) {
      for (const aliases of Object.values(entry.roles)) {
        if (aliases[0]) {
          allPrimaryAliases.push(aliases[0]);
        }
      }
    }

    const prefix = this.guildConfig.prefix;
    const [firstRole, secondRole] = allPrimaryAliases;

    const help1 = asSingleLine(`
      To give yourself a role, type e.g. \`${prefix}role ${firstRole}\` where **${firstRole}** is the role you want.
      ${secondRole ? `You can also add multiple roles at once, e.g. \`${prefix}role ${firstRole} ${secondRole}\`` : ""}
    `);

    const help2 = asSingleLine(`
      To remove a role, type \`${prefix}role remove ${firstRole}\`,
      again replacing **${firstRole}** with the role you want to remove.
    `);

    const helpMessage = trimLines(`
      ${help1}

      ${help2}

      **Roles available to you:**
      ${allPrimaryAliases.join(", ")}
    `);

    const helpEmbed = {
      title: "How to get roles",
      description: helpMessage,
      color: parseInt("42bff4", 16),
    };

    msg.channel.createMessage({ embed: helpEmbed });
  }

  @d.command("role remove", "<roleNames:string...>")
  async roleRemoveCmd(msg: Message, args: { roleNames: string[] }) {
    const lock = await this.locks.acquire(`grantableRoles:${msg.author.id}`);

    const applyingEntries = this.getApplyingEntries(msg);
    if (applyingEntries.length === 0) {
      lock.unlock();
      return;
    }

    const roleNames = this.normalizeRoleNames(this.splitRoleNames(args.roleNames));
    const matchedRoleIds = this.findMatchingRoles(roleNames, applyingEntries);

    const rolesToRemove = Array.from(matchedRoleIds.values()).map(id => this.guild.roles.get(id));
    const roleIdsToRemove = rolesToRemove.map(r => r.id);

    // Remove the roles
    if (rolesToRemove.length) {
      const newRoleIds = msg.member.roles.filter(roleId => !roleIdsToRemove.includes(roleId));

      try {
        await msg.member.edit({
          roles: newRoleIds,
        });

        const removedRolesStr = rolesToRemove.map(r => `**${r.name}**`);
        const removedRolesWord = rolesToRemove.length === 1 ? "role" : "roles";

        if (rolesToRemove.length !== roleNames.length) {
          this.sendSuccessMessage(
            msg.channel,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord};` +
              ` couldn't recognize the other roles you mentioned`,
          );
        } else {
          this.sendSuccessMessage(
            msg.channel,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord}`,
          );
        }
      } catch (e) {
        this.sendSuccessMessage(msg.channel, `<@!${msg.author.id}> Got an error while trying to remove the roles`);
      }
    } else {
      msg.channel.createMessage(
        errorMessage(`<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`),
      );
    }

    lock.unlock();
  }

  @d.command("role", "<roleNames:string...>")
  async roleCmd(msg: Message, args: { roleNames: string[] }) {
    const lock = await this.locks.acquire(`grantableRoles:${msg.author.id}`);

    const applyingEntries = this.getApplyingEntries(msg);
    if (applyingEntries.length === 0) {
      lock.unlock();
      return;
    }

    const roleNames = this.normalizeRoleNames(this.splitRoleNames(args.roleNames));
    const matchedRoleIds = this.findMatchingRoles(roleNames, applyingEntries);

    const hasUnknownRoles = matchedRoleIds.length !== roleNames.length;

    const rolesToAdd: Map<string, Role> = Array.from(matchedRoleIds.values())
      .map(id => this.guild.roles.get(id))
      .filter(Boolean)
      .reduce((map, role) => {
        map.set(role.id, role);
        return map;
      }, new Map());

    if (!rolesToAdd.size) {
      this.sendErrorMessage(
        msg.channel,
        `<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`,
      );
      lock.unlock();
      return;
    }

    // Grant the roles
    const newRoleIds = new Set([...rolesToAdd.keys(), ...msg.member.roles]);

    // Remove extra roles (max_roles) for each entry
    const skipped: Set<Role> = new Set();
    const removed: Set<Role> = new Set();

    for (const entry of applyingEntries) {
      if (entry.max_roles === 0) continue;

      let foundRoles = 0;

      for (const roleId of newRoleIds) {
        if (entry.roles[roleId]) {
          if (foundRoles < entry.max_roles) {
            foundRoles++;
          } else {
            newRoleIds.delete(roleId);
            rolesToAdd.delete(roleId);

            if (msg.member.roles.includes(roleId)) {
              removed.add(this.guild.roles.get(roleId));
            } else {
              skipped.add(this.guild.roles.get(roleId));
            }
          }
        }
      }
    }

    try {
      await msg.member.edit({
        roles: Array.from(newRoleIds),
      });
    } catch (e) {
      this.sendErrorMessage(msg.channel, `<@!${msg.author.id}> Got an error while trying to grant you the roles`);
      return;
    }

    const mentionRoles = this.getConfig().mention_roles;
    const addedRolesStr = Array.from(rolesToAdd.values()).map(r => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`));
    const addedRolesWord = rolesToAdd.size === 1 ? "role" : "roles";

    const messageParts = [];
    messageParts.push(`Granted you the ${addedRolesStr.join(", ")} ${addedRolesWord}`);

    if (skipped.size || removed.size) {
      const skippedRolesStr = skipped.size
        ? "skipped " +
          Array.from(skipped.values())
            .map(r => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`))
            .join(",")
        : null;
      const removedRolesStr = removed.size
        ? "removed " + Array.from(removed.values()).map(r => (mentionRoles ? `<@&${r.id}>` : `**${r.name}**`))
        : null;

      const skippedRemovedStr = [skippedRolesStr, removedRolesStr].filter(Boolean).join(" and ");

      messageParts.push(`${skippedRemovedStr} due to role limits`);
    }

    if (hasUnknownRoles) {
      messageParts.push("couldn't recognize some of the roles");
    }

    this.sendSuccessMessage(msg.channel, `<@!${msg.author.id}> ${messageParts.join("; ")}`);

    lock.unlock();
  }
}
