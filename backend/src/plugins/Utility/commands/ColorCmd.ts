import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { hexColorRegex } from "src/utils";
import { sendErrorMessage } from "src/pluginUtils";
import { createCanvas } from "canvas";


export const ColorCmd = utilityCmd({
    trigger: ["color", "colour"],
    description: "Creates a preview of a given colour",
    usage: "!color #7289da",
    permission: "can_color",

    signature: {
        color: ct.string({ required: false })
    },

    async run({ message, args, pluginData }) {
        const hexcodeMatch = args.color?.match(hexColorRegex);
        if (!hexcodeMatch?.[1]) {
            sendErrorMessage(pluginData, message.channel, "Invalid hex code");
            return;
        }

        const size = 250;
        const canvas = createCanvas(size,size);
        const context = canvas.getContext('2d');

        context.fillStyle = '#' + hexcodeMatch[1];
        context.fillRect(0,0,size,size);

        const file = {
            name: `${hexcodeMatch[1]}.png`,
            file: canvas.toBuffer('image/png')
        };

        message.channel.createMessage('', file);
    },
});