import { MessageAttachment } from "discord.js";
import fs from "fs";
import photon from "@silvia-odwyer/photon-node";
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

function bufferToPhotonImage(input: Buffer): photon.PhotonImage {
  const base64 = input.toString("base64").replace(/^data:image\/\w+;base64,/, "");

  return photon.PhotonImage.new_from_base64(base64);
}

function photonImageToBuffer(image: photon.PhotonImage): Buffer {
  const base64 = image.get_base64().replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

function resizeBuffer(input: Buffer, width: number, height: number): Buffer {
  const photonImage = bufferToPhotonImage(input);
  photon.resize(photonImage, width, height, photon.SamplingFilter.Lanczos3);
  return photonImageToBuffer(photonImage);
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
    let extension = ".png";
    let file: MessageAttachment | undefined;

    if (!isEmoji(args.emoji)) {
      sendErrorMessage(pluginData, msg.channel, "Invalid emoji");
      return;
    }

    if (results) {
      let url = "https://cdn.discordapp.com/emojis/";
      if (results[1] === "<a:") {
        extension = ".gif";
      }
      url += `${results[2]}${extension}`;
      if (extension === ".png") {
        const image = await resizeBuffer(await getBufferFromUrl(url), size, size);
        file = new MessageAttachment(image, `emoji${extension}`);
      } else {
        const image = await getBufferFromUrl(url);
        file = new MessageAttachment(image, `emoji${extension}`);
      }
    } else {
      let url = CDN_URL + `/${twemoji.convert.toCodePoint(args.emoji)}.svg`;
      let image: Buffer | undefined;
      try {
        image = await resizeBuffer(await getBufferFromUrl(url), size, size);
      } catch {
        if (url.toLocaleLowerCase().endsWith("fe0f.svg")) {
          url = url.slice(0, url.lastIndexOf("-fe0f")) + ".svg";
          image = await resizeBuffer(await getBufferFromUrl(url), size, size);
        }
      }
      if (!image) {
        sendErrorMessage(pluginData, msg.channel, "Invalid emoji");
        return;
      }

      file = new MessageAttachment(image, "emoji.png");
    }

    msg.channel.send({ files: [file] });
  },
});
