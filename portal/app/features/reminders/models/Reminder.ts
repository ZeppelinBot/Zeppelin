import { ReminderSchema } from "#database/schema";

export class Reminder extends ReminderSchema {
  static table = "reminders";
}

export default Reminder;
