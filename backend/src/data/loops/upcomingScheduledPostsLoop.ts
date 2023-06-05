// tslint:disable:no-console

import moment from "moment-timezone";
import { lazyMemoize, MINUTES } from "../../utils";
import { ScheduledPost } from "../entities/ScheduledPost";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents";
import { ScheduledPosts } from "../ScheduledPosts";
import Timeout = NodeJS.Timeout;

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getScheduledPostsRepository = lazyMemoize(() => new ScheduledPosts());
const timeouts = new Map<number, Timeout>();

function broadcastScheduledPost(post: ScheduledPost, tries = 0) {
  if (!hasGuildEventListener(post.guild_id, "scheduledPost")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        post.id,
        setTimeout(() => broadcastScheduledPost(post, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(post.guild_id, "scheduledPost", [post]);
}

export async function runUpcomingScheduledPostsLoop() {
  console.log("[SCHEDULED POSTS LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[SCHEDULED POSTS LOOP] Setting timeouts for upcoming scheduled posts");
  const postsDueSoon = await getScheduledPostsRepository().getScheduledPostsDueSoon(LOOP_INTERVAL);
  for (const post of postsDueSoon) {
    const remaining = Math.max(0, moment.utc(post.post_at!).diff(moment.utc()));
    timeouts.set(
      post.id,
      setTimeout(() => broadcastScheduledPost(post), remaining),
    );
  }

  console.log("[SCHEDULED POSTS LOOP] Scheduling next loop");
  setTimeout(() => runUpcomingScheduledPostsLoop(), LOOP_INTERVAL);
}

export function registerUpcomingScheduledPost(post: ScheduledPost) {
  clearUpcomingScheduledPost(post);

  if (post.post_at === null) {
    return;
  }

  console.log("[SCHEDULED POSTS LOOP] Registering new upcoming scheduled post");
  const remaining = Math.max(0, moment.utc(post.post_at).diff(moment.utc()));
  if (remaining > LOOP_INTERVAL) {
    return;
  }

  timeouts.set(
    post.id,
    setTimeout(() => broadcastScheduledPost(post), remaining),
  );
}

export function clearUpcomingScheduledPost(post: ScheduledPost) {
  console.log("[SCHEDULED POSTS LOOP] Clearing upcoming scheduled post");
  if (timeouts.has(post.id)) {
    clearTimeout(timeouts.get(post.id)!);
  }
}
