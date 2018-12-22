import { Plugin, decorators as d } from "knub";
import { Message } from "eris";
import { errorMessage, successMessage } from "../utils";
import { GuildTags } from "../data/GuildTags";

export class TagsPlugin extends Plugin {
  protected tags: GuildTags;

  getDefaultOptions() {
    return {
      config: {
        prefix: "!!"
      },

      permissions: {
        create: false,
        use: true
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            create: true
          }
        }
      ]
    };
  }

  onLoad() {
    this.tags = GuildTags.getInstance(this.guildId);
  }

  @d.command("tag delete", "<tag:string>")
  @d.permission("create")
  async deleteTagCmd(msg: Message, args: { tag: string }) {
    const tag = await this.tags.find(args.tag);
    if (!tag) {
      msg.channel.createMessage(errorMessage("No tag with that name"));
      return;
    }

    await this.tags.delete(args.tag);
    msg.channel.createMessage(successMessage("Tag deleted!"));
  }

  @d.command("tag", "<tag:string> <body:string$>")
  @d.permission("create")
  async tagCmd(msg: Message, args: { tag: string; body: string }) {
    await this.tags.createOrUpdate(args.tag, args.body, msg.author.id);

    const prefix = this.configValue("prefix");
    msg.channel.createMessage(successMessage(`Tag set! Use it with: \`${prefix}${args.tag}\``));
  }

  @d.event("messageCreate")
  @d.permission("use")
  async onMessageCreate(msg: Message) {
    if (!msg.content) return;
    if (msg.type !== 0) return;
    if (!msg.author || msg.author.bot) return;

    const prefix = this.configValueForMsg(msg, "prefix");
    if (!msg.content.startsWith(prefix)) return;

    const withoutPrefix = msg.content.slice(prefix.length);
    const tag = await this.tags.find(withoutPrefix);
    if (!tag) return;

    msg.channel.createMessage(tag.body);
  }
}
