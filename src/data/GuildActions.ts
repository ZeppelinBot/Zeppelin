import { BaseRepository } from "./BaseRepository";
import { Member, TextableChannel } from "eris";
import { CaseTypes } from "./CaseTypes";
import { ICaseDetails } from "./GuildCases";
import { Case } from "./entities/Case";
import { INotifyUserResult } from "../utils";

type KnownActions = "mute" | "unmute";

// https://github.com/Microsoft/TypeScript/issues/4183#issuecomment-382867018
type UnknownAction<T extends string> = T extends KnownActions ? never : T;

type ActionFn<T> = (args: T) => any | Promise<any>;

type MuteActionArgs = { userId: string; muteTime?: number; reason?: string; caseDetails?: ICaseDetails };
type UnmuteActionArgs = { userId: string; unmuteTime?: number; reason?: string; caseDetails?: ICaseDetails };
type CreateCaseActionArgs = ICaseDetails;
type CreateCaseNoteActionArgs = {
  caseId: number;
  modId: string;
  note: string;
  automatic?: boolean;
  postInCaseLog?: boolean;
  noteDetails?: string[];
};
type PostCaseActionArgs = {
  caseId: number;
  channel: TextableChannel;
};

export type MuteActionResult = {
  case: Case;
  notifyResult: INotifyUserResult;
  updatedExistingMute: boolean;
};

export type UnmuteActionResult = {
  case: Case;
};

export class GuildActions extends BaseRepository {
  private actions: Map<string, ActionFn<any>>;

  constructor(guildId) {
    super(guildId);
    this.actions = new Map();
  }

  public register(actionName: "mute", actionFn: ActionFn<MuteActionArgs>): void;
  public register(actionName: "unmute", actionFn: ActionFn<UnmuteActionArgs>): void;
  public register(actionName: "createCase", actionFn: ActionFn<CreateCaseActionArgs>): void;
  public register(actionName: "createCaseNote", actionFn: ActionFn<CreateCaseNoteActionArgs>): void;
  public register(actionName: "postCase", actionFn: ActionFn<PostCaseActionArgs>): void;
  // https://github.com/Microsoft/TypeScript/issues/4183#issuecomment-382867018
  public register<T extends string & UnknownAction<U>, U extends string = T>(
    actionName: T,
    actionFn: ActionFn<any>,
  ): void;
  public register(actionName, actionFn): void {
    if (this.actions.has(actionName)) {
      throw new Error("Action is already registered!");
    }

    this.actions.set(actionName, actionFn);
  }

  public unregister(actionName: string): void {
    this.actions.delete(actionName);
  }

  public fire(actionName: "mute", args: MuteActionArgs): Promise<MuteActionResult>;
  public fire(actionName: "unmute", args: UnmuteActionArgs): Promise<UnmuteActionResult>;
  public fire(actionName: "createCase", args: CreateCaseActionArgs): Promise<any>;
  public fire(actionName: "createCaseNote", args: CreateCaseNoteActionArgs): Promise<any>;
  public fire(actionName: "postCase", args: PostCaseActionArgs): Promise<any>;
  // https://github.com/Microsoft/TypeScript/issues/4183#issuecomment-382867018
  public fire<T extends string & UnknownAction<U>, U extends string = T>(actionName: T, args: any): Promise<any>;
  public fire(actionName, args): Promise<any> {
    return this.actions.has(actionName) ? this.actions.get(actionName)(args) : null;
  }
}
