import { AutomodActionBlueprint } from "../helpers";
import { AddRolesAction } from "./addRoles";
import { AddToCounterAction } from "./addToCounter";
import { AlertAction } from "./alert";
import { ArchiveThreadAction } from "./archiveThread";
import { BanAction } from "./ban";
import { ChangeNicknameAction } from "./changeNickname";
import { ChangePermsAction } from "./changePerms";
import { CleanAction } from "./clean";
import { KickAction } from "./kick";
import { LogAction } from "./log";
import { MuteAction } from "./mute";
import { RemoveRolesAction } from "./removeRoles";
import { ReplyAction } from "./reply";
import { SetAntiraidLevelAction } from "./setAntiraidLevel";
import { SetCounterAction } from "./setCounter";
import { SetSlowmodeAction } from "./setSlowmode";
import { StartThreadAction } from "./startThread";
import { WarnAction } from "./warn";

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
} satisfies Record<string, AutomodActionBlueprint<any>>;
