import { Message } from "eris";

export function sendUserMentionMessage(message: Message, status: string) {
    return message.channel.createMessage({
        allowedMentions: {
            users: [message.author.id],
            everyone: false,
            roles: false,
        },
        content: `<@!${message.author.id}>, the user mentioned is currently AFK: **${status}**`,
    });
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