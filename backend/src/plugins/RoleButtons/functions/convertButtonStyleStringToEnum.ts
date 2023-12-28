import { ButtonStyle } from "discord.js";
import { TRoleButtonOption } from "../types.js";

export function convertButtonStyleStringToEnum(input: TRoleButtonOption["style"]): ButtonStyle | null | undefined {
  switch (input) {
    case "PRIMARY":
      return ButtonStyle.Primary;
    case "SECONDARY":
      return ButtonStyle.Secondary;
    case "SUCCESS":
      return ButtonStyle.Success;
    case "DANGER":
      return ButtonStyle.Danger;
    default:
      return input;
  }
}
