import { PermissionsBitField } from "discord.js";

const p = PermissionsBitField.Flags;

export const NATIVE_SLOWMODE_PERMISSIONS = p.ViewChannel | p.ManageChannels;
export const BOT_SLOWMODE_PERMISSIONS = p.ViewChannel | p.ManageRoles | p.ManageMessages;
export const BOT_SLOWMODE_CLEAR_PERMISSIONS = p.ViewChannel | p.ManageRoles;
export const BOT_SLOWMODE_DISABLE_PERMISSIONS = p.ViewChannel | p.ManageRoles;
