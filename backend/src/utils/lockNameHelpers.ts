import { Member, Message, User } from "eris";
import { SavedMessage } from "../data/entities/SavedMessage";

export function allStarboardsLock() {
  return `starboards`;
}

export function banLock(user: Member | User | { id: string }) {
  return `ban-${user.id}`;
}

export function counterIdLock(counterId: number | string) {
  return `counter-${counterId}`;
}

export function memberRolesLock(member: Member | User | { id: string }) {
  return `member-roles-${member.id}`;
}

export function messageLock(message: Message | SavedMessage | { id: string }) {
  return `message-${message.id}`;
}

export function muteLock(user: Member | User | { id: string }) {
  return `mute-${user.id}`;
}
