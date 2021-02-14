import { EventEmitter } from "events";

export function unregisterEventListenersFromMap(eventEmitter: EventEmitter, map: Map<string, any>) {
  for (const [event, listener] of map.entries()) {
    eventEmitter.off(event, listener);
  }
}
