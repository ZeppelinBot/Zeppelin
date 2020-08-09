import { Constants } from "eris";

const p = Constants.Permissions;

export const NATIVE_SLOWMODE_PERMISSIONS = p.readMessages | p.manageChannels;
export const BOT_SLOWMODE_PERMISSIONS = p.readMessages | p.manageRoles | p.manageMessages;
export const BOT_SLOWMODE_CLEAR_PERMISSIONS = p.readMessages | p.manageRoles;
export const BOT_SLOWMODE_DISABLE_PERMISSIONS = p.readMessages | p.manageRoles;
