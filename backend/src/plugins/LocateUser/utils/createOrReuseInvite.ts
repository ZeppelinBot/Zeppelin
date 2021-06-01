export async function createOrReuseInvite(vc: VoiceChannel) {
  const existingInvites = await vc.getInvites();

  if (existingInvites.length !== 0) {
    return existingInvites[0];
  } else {
    return vc.createInvite(undefined);
  }
}
