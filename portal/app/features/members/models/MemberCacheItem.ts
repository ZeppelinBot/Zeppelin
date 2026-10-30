import { MemberCacheSchema } from "#database/schema";

export class MemberCacheItem extends MemberCacheSchema {
  static table = "member_cache";
}

export default MemberCacheItem;
