import { AutomodActionBlueprint } from "../helpers.js";
import { AddRolesAction } from "./addRoles.js";
import { AddToCounterAction } from "./addToCounter.js";
import { AlertAction } from "./alert.js";
import { ArchiveThreadAction } from "./archiveThread.js";
import { BanAction } from "./ban.js";
import { ChangeNicknameAction } from "./changeNickname.js";
import { ChangePermsAction } from "./changePerms.js";
import { CleanAction } from "./clean.js";
import { KickAction } from "./kick.js";
import { LogAction } from "./log.js";
import { MuteAction } from "./mute.js";
import { PauseInvitesAction } from "./pauseInvites.js";
import { RemoveRolesAction } from "./removeRoles.js";
import { ReplyAction } from "./reply.js";
import { SetAntiraidLevelAction } from "./setAntiraidLevel.js";
import { SetCounterAction } from "./setCounter.js";
import { SetSlowmodeAction } from "./setSlowmode.js";
import { StartThreadAction } from "./startThread.js";
import { WarnAction } from "./warn.js";

export const availableActions = {
  clean: CleanAction,
  warn: WarnAction,
  mute: MuteAction,
  kick: KickAction,
  ban: BanAction,
  alert: AlertAction,
  change_nickname: ChangeNicknameAction,
  log: LogAction,
  add_roles: AddRolesAction,
  remove_roles: RemoveRolesAction,
  set_antiraid_level: SetAntiraidLevelAction,
  reply: ReplyAction,
  add_to_counter: AddToCounterAction,
  set_counter: SetCounterAction,
  set_slowmode: SetSlowmodeAction,
  start_thread: StartThreadAction,
  archive_thread: ArchiveThreadAction,
  change_perms: ChangePermsAction,
  pause_invites: PauseInvitesAction,
} satisfies Record<string, AutomodActionBlueprint<any>>;
