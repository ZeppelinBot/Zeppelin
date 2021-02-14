import { EventEmitter } from "events";

export function registerEventListenersFromMap(eventEmitter: EventEmitter, map: Map<string, any>) {
  for (const [event, listener] of map.entries()) {
    eventEmitter.on(event, listener);
  }
}
