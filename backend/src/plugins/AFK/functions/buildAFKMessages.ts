import { Message } from "eris";

export function sendUserMentionMessage(message: Message, mentionedMembers: string[] | { id: string, status: string }) {
    if (!(mentionedMembers instanceof Array)) {
      const member = mentionedMembers as { id: string, status: string };
      return message.channel.createMessage({
        allowedMentions: {
          users: [message.author.id],
          everyone: false,
          roles: false,
        },
        content: `<@!${message.author.id}>, <@!${member.id}> is currently AFK: **${member.status}**`,
      });
    } else {
      const deliveredLength = mentionedMembers.length;
      const arr = mentionedMembers.length > 3 ? mentionedMembers.splice(3) : mentionedMembers;

      return message.channel.createMessage({
        allowedMentions: {
          users: [message.author.id],
          everyone: false,
          roles: false,
        },
        content: `<@!${message.author.id}>, the following users mentioned are AFK:\n\n${mentionedMembers.join('\n')}${
          deliveredLength > 3
            ? `\n*+${arr.length} more...*` 
            : ''
        }`,
      });
    }
}

export function sendWelcomeBackMessage(message: Message) {
    return message.channel.createMessage({
        allowedMentions: {
            users: [message.author.id],
            everyone: false,
            roles: false,
        },
        content: `<@!${message.author.id}>, welcome back!`,
    });
}
