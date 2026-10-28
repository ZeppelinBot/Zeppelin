import { MemberTimezoneSchema } from "#database/schema";

export class MemberTimezone extends MemberTimezoneSchema {
  static table = "member_timezones";
}

export default MemberTimezone;
