import moment from "moment";

const EPOCH = 1420070400000;

export function idToTimestamp(id: string) {
  if (typeof id === "number") return null;
  return moment(+id / 4194304 + EPOCH)
    .utc()
    .valueOf();
}
