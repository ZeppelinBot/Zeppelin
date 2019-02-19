import { decorators as d } from "knub";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildReminders } from "../data/GuildReminders";
import { Message, TextChannel } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { convertDelayStringToMS, createChunkedMessage, errorMessage, sorter, successMessage } from "../utils";

const REMINDER_LOOP_TIME = 10 * 1000;
const MAX_TRIES = 3;

export class RemindersPlugin extends ZeppelinPlugin {
  public static pluginName = "reminders";

  protected reminders: GuildReminders;
  protected tries: Map<number, number>;

  private postRemindersTimeout;

  getDefaultOptions() {
    return {
      permissions: {
        use: false,
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            use: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.reminders = GuildReminders.getInstance(this.guildId);
    this.tries = new Map();
    this.postDueRemindersLoop();
  }

  async postDueRemindersLoop() {
    const pendingReminders = await this.reminders.getDueReminders();
    for (const reminder of pendingReminders) {
      const channel = this.guild.channels.get(reminder.channel_id);
      if (channel && channel instanceof TextChannel) {
        try {
          await channel.createMessage(`<@!${reminder.user_id}> You asked me to remind you: ${reminder.body}`);
        } catch (e) {
          // Probably random Discord internal server error or missing permissions or somesuch
          // Try again next round unless we've already tried to post this a bunch of times
          const tries = this.tries.get(reminder.id) || 0;
          if (tries < MAX_TRIES) {
            this.tries.set(reminder.id, tries + 1);
            continue;
          }
        }
      }

      await this.reminders.delete(reminder.id);
    }

    this.postRemindersTimeout = setTimeout(() => this.postDueRemindersLoop(), REMINDER_LOOP_TIME);
  }

  @d.command("remind", "<time:string> <reminder:string$>")
  @d.command("remindme", "<time:string> <reminder:string$>")
  @d.permission("use")
  async addReminderCmd(msg: Message, args: { time: string; reminder: string }) {
    const now = moment();

    let reminderTime;
    if (args.time.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      // Date in YYYY-MM-DD format, remind at current time on that date
      reminderTime = moment(args.time, "YYYY-M-D").set({
        hour: now.hour(),
        minute: now.minute(),
        second: now.second(),
      });
    } else if (args.time.match(/^\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}$/)) {
      // Date and time in YYYY-MM-DD[T]HH:mm format
      reminderTime = moment(args.time, "YYYY-M-D[T]HH:mm").second(0);
    } else {
      // "Delay string" i.e. e.g. "2h30m"
      const ms = convertDelayStringToMS(args.time);
      if (ms === null) {
        msg.channel.createMessage(errorMessage("Invalid reminder time"));
        return;
      }

      reminderTime = moment().add(ms, "millisecond");
    }

    if (!reminderTime.isValid() || reminderTime.isBefore(now)) {
      msg.channel.createMessage(errorMessage("Invalid reminder time"));
      return;
    }

    await this.reminders.add(msg.author.id, msg.channel.id, reminderTime.format("YYYY-MM-DD HH:mm:ss"), args.reminder);

    const msUntilReminder = reminderTime.diff(now);
    const timeUntilReminder = humanizeDuration(msUntilReminder, { largest: 2, round: true });
    msg.channel.createMessage(
      successMessage(
        `I will remind you in **${timeUntilReminder}** at **${reminderTime.format("YYYY-MM-DD, HH:mm")}**`,
      ),
    );
  }

  @d.command("reminders")
  @d.permission("use")
  async reminderListCmd(msg: Message) {
    const reminders = await this.reminders.getRemindersByUserId(msg.author.id);
    if (reminders.length === 0) {
      msg.channel.createMessage(errorMessage("No reminders"));
      return;
    }

    reminders.sort(sorter("remind_at"));
    const longestNum = (reminders.length + 1).toString().length;
    const lines = Array.from(reminders.entries()).map(([i, reminder]) => {
      const num = i + 1;
      const paddedNum = num.toString().padStart(longestNum, " ");
      return `\`${paddedNum}.\` \`${reminder.remind_at}\` ${reminder.body}`;
    });

    createChunkedMessage(msg.channel, lines.join("\n"));
  }

  @d.command("reminders delete", "<num:number>")
  @d.command("reminders d", "<num:number>")
  @d.permission("use")
  async deleteReminderCmd(msg: Message, args: { num: number }) {
    const reminders = await this.reminders.getRemindersByUserId(msg.author.id);
    reminders.sort(sorter("remind_at"));
    const lastNum = reminders.length + 1;

    if (args.num > lastNum || args.num < 0) {
      msg.channel.createMessage(errorMessage("Unknown reminder"));
      return;
    }

    const toDelete = reminders[args.num - 1];
    await this.reminders.delete(toDelete.id);

    msg.channel.createMessage(successMessage("Reminder deleted"));
  }
}
