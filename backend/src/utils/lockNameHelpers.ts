import { GuildMember, Message, User } from "discord.js";
import { SavedMessage } from "../data/entities/SavedMessage";

export function allStarboardsLock() {
  return `starboards`;
}

export function banLock(user: GuildMember | User | { id: string }) {
  return `ban-${user.id}`;
}

export function counterIdLock(counterId: number | string) {
  return `counter-${counterId}`;
}

export function memberRolesLock(member: GuildMember | User | { id: string }) {
  return `member-roles-${member.id}`;
}

export function messageLock(message: Message | SavedMessage | { id: string }) {
  return `message-${message.id}`;
}

export function muteLock(user: GuildMember | User | { id: string }) {
  return `mute-${user.id}`;
}
