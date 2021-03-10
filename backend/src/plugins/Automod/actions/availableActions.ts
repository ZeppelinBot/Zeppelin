import * as t from "io-ts";
import { CleanAction } from "./clean";
import { AutomodActionBlueprint } from "../helpers";
import { WarnAction } from "./warn";
import { MuteAction } from "./mute";
import { KickAction } from "./kick";
import { BanAction } from "./ban";
import { AlertAction } from "./alert";
import { ChangeNicknameAction } from "./changeNickname";
import { LogAction } from "./log";
import { AddRolesAction } from "./addRoles";
import { RemoveRolesAction } from "./removeRoles";
import { SetAntiraidLevelAction } from "./setAntiraidLevel";
import { ReplyAction } from "./reply";
import { ChangeCounterAction } from "./changeCounter";

export const availableActions: Record<string, AutomodActionBlueprint<any>> = {
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
  change_counter: ChangeCounterAction,
};

export const AvailableActions = t.type({
  clean: CleanAction.configType,
  warn: WarnAction.configType,
  mute: MuteAction.configType,
  kick: KickAction.configType,
  ban: BanAction.configType,
  alert: AlertAction.configType,
  change_nickname: ChangeNicknameAction.configType,
  log: LogAction.configType,
  add_roles: AddRolesAction.configType,
  remove_roles: RemoveRolesAction.configType,
  set_antiraid_level: SetAntiraidLevelAction.configType,
  reply: ReplyAction.configType,
  change_counter: ChangeCounterAction.configType,
});
