import { SlowmodeChannelSchema } from "#database/schema";

export class SlowmodeChannel extends SlowmodeChannelSchema {
  static table = "slowmode_channels";
}

export default SlowmodeChannel;
