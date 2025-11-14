import { AttachmentSlashCommandOption, slashOptions } from "vety";

type AttachmentSlashOptions = Omit<AttachmentSlashCommandOption, "type" | "resolveValue" | "getExtraAPIProps">;

export function generateAttachmentSlashOptions(amount: number, options: AttachmentSlashOptions) {
  return new Array(amount).fill(0).map((_, i) => {
    return slashOptions.attachment({
      name: amount > 1 ? `${options.name}${i + 1}` : options.name,
      description: options.description,
      required: options.required ?? false,
    });
  });
}

export function retrieveMultipleOptions(amount: number, options: any, name: string) {
  return new Array(amount)
    .fill(0)
    .map((_, i) => options[amount > 1 ? `${name}${i + 1}` : name])
    .filter((a) => a);
}
