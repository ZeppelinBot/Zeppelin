import { BaseRepository } from "./BaseRepository";

type ActionFn = (...args: any[]) => any | Promise<any>;

export class GuildActions extends BaseRepository {
  private actions: Map<string, ActionFn>;

  constructor(guildId) {
    super(guildId);
    this.actions = new Map();
  }

  public register(actionName: string, actionFn: ActionFn) {
    this.actions.set(actionName, actionFn);
  }

  public unregister(actionName: string) {
    this.actions.delete(actionName);
  }

  public fire(actionName: string, ...args: any[]): Promise<any> {
    return this.actions.has(actionName) ? this.actions.get(actionName)(...args) : null;
  }
}
