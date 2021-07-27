import { VoiceChannel } from "discord.js";

export async function createOrReuseInvite(vc: VoiceChannel) {
  const existingInvites = await vc.fetchInvites();

  if (existingInvites.size !== 0) {
    return existingInvites.first()!;
  } else {
    return vc.createInvite();
  }
}
