import moment, { Moment } from "moment-timezone";
import { convertDelayStringToMS } from "src/utils";

export function parseScheduleTime(str): Moment {
  const dt1 = moment(str, "YYYY-MM-DD HH:mm:ss");
  if (dt1 && dt1.isValid()) return dt1;

  const dt2 = moment(str, "YYYY-MM-DD HH:mm");
  if (dt2 && dt2.isValid()) return dt2;

  const date = moment(str, "YYYY-MM-DD");
  if (date && date.isValid()) return date;

  const t1 = moment(str, "HH:mm:ss");
  if (t1 && t1.isValid()) {
    if (t1.isBefore(moment())) t1.add(1, "day");
    return t1;
  }

  const t2 = moment(str, "HH:mm");
  if (t2 && t2.isValid()) {
    if (t2.isBefore(moment())) t2.add(1, "day");
    return t2;
  }

  const delayStringMS = convertDelayStringToMS(str, "m");
  if (delayStringMS) {
    return moment().add(delayStringMS, "ms");
  }

  return null;
}
