import fs from "fs";
import sharp from "sharp";
import twemoji from "twemoji";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { downloadFile, isEmoji, SECONDS } from "../../../utils";
import { utilityCmd } from "../types";

const fsp = fs.promises;

async function getBufferFromUrl(url: string): Promise<Buffer> {
  const downloadedEmoji = await downloadFile(url);
  return fsp.readFile(downloadedEmoji.path);
}

async function resizeBuffer(input: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(input, { density: 800 })
    .resize(width, height, {
      fit: "inside",
    })
    .toBuffer();
}

const CDN_URL = "https://twemoji.maxcdn.com/2/svg";

export const JumboCmd = utilityCmd({
  trigger: "jumbo",
  description: "Makes an emoji jumbo",
  permission: "can_jumbo",
  cooldown: 5 * SECONDS,

  signature: {
    emoji: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    // Get emoji url
    const config = pluginData.config.get();
    const size = config.jumbo_size > 2048 ? 2048 : config.jumbo_size;
    const emojiRegex = new RegExp(`(<.*:).*:(\\d+)`);
    const results = emojiRegex.exec(args.emoji);
    let extention = ".png";
    let file;

    if (!isEmoji(args.emoji)) {
      sendErrorMessage(pluginData, msg.channel, "Invalid emoji");
      return;
    }

    if (results) {
      let url = "https://cdn.discordapp.com/emojis/";
      if (results[1] === "<a:") {
        extention = ".gif";
      }
      url += `${results[2]}${extention}`;
      if (extention === ".png") {
        const image = await resizeBuffer(await getBufferFromUrl(url), size, size);
        file = {
          name: `emoji${extention}`,
          file: image,
        };
      } else {
        const image = await getBufferFromUrl(url);
        file = {
          name: `emoji${extention}`,
          file: image,
        };
      }
    } else {
      let url = CDN_URL + `/${twemoji.convert.toCodePoint(args.emoji)}.svg`;
      let image;
      try {
        image = await resizeBuffer(await getBufferFromUrl(url), size, size);
      } catch {
        if (url.toLocaleLowerCase().endsWith("fe0f.svg")) {
          url = url.slice(0, url.lastIndexOf("-fe0f")) + ".svg";
          image = await resizeBuffer(await getBufferFromUrl(url), size, size);
        }
      }
      file = {
        name: `emoji.png`,
        file: image,
      };
    }

    msg.channel.send({ content: "", files: [file] });
  },
});
