import { Plugin, decorators as d } from "knub";
import { Message, TextChannel } from "eris";

export class UtilityPlugin extends Plugin {
  getDefaultOptions() {
    return {
      permissions: {
        roles: false
      },
      overrides: [
        {
          level: ">=50",
          permissions: {
            roles: true
          }
        }
      ]
    };
  }

  @d.command("roles")
  @d.permission("roles")
  async rolesCmd(msg: Message) {
    const roles = (msg.channel as TextChannel).guild.roles.map(
      role => `${role.name} ${role.id}`
    );
    msg.channel.createMessage("```" + roles.join("\n") + "```");
  }
}
