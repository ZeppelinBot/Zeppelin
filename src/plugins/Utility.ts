import { Plugin, decorators as d } from "knub";
import { Message, TextChannel } from "eris";
import { errorMessage } from "../utils";

export class UtilityPlugin extends Plugin {
  getDefaultOptions() {
    return {
      permissions: {
        roles: false,
        level: false
      },
      overrides: [
        {
          level: ">0",
          permissions: {
            level: true
          }
        },
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
    const roles = (msg.channel as TextChannel).guild.roles.map(role => `${role.name} ${role.id}`);
    msg.channel.createMessage("```" + roles.join("\n") + "```");
  }

  @d.command("level", "[userId:string]")
  @d.permission("level")
  async levelCmd(msg: Message, args) {
    const member = args.userId ? this.guild.members.get(args.userId) : msg.member;

    if (!member) {
      msg.channel.createMessage(errorMessage("Member not found"));
      return;
    }

    const level = this.getMemberLevel(member);
    msg.channel.createMessage(
      `The permission level of ${member.username}#${member.discriminator} is **${level}**`
    );
  }
}
