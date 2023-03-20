import type { QueryRunner } from "typeorm";
import { AdvancedConsoleLogger } from "typeorm/logger/AdvancedConsoleLogger";

let groupedQueryStats: Map<string, number> = new Map();

const selectTableRegex = /FROM `?([^\s`]+)/i;
const updateTableRegex = /UPDATE `?([^\s`]+)/i;
const deleteTableRegex = /FROM `?([^\s`]+)/;
const insertTableRegex = /INTO `?([^\s`]+)/;

export class QueryLogger extends AdvancedConsoleLogger {
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    let type: string | undefined;
    let table: string | undefined;

    if (query.startsWith("SELECT")) {
      type = "SELECT";
      table = query.match(selectTableRegex)?.[1];
    } else if (query.startsWith("UPDATE")) {
      type = "UPDATE";
      table = query.match(updateTableRegex)?.[1];
    } else if (query.startsWith("DELETE")) {
      type = "DELETE";
      table = query.match(deleteTableRegex)?.[1];
    } else if (query.startsWith("INSERT")) {
      type = "INSERT";
      table = query.match(insertTableRegex)?.[1];
    } else {
      return;
    }

    const key = `${type} ${table}`;
    const newCount = (groupedQueryStats.get(key) ?? 0) + 1;
    groupedQueryStats.set(key, newCount);
  }
}

export function consumeQueryStats() {
  const map = groupedQueryStats;
  groupedQueryStats = new Map();
  return map;
}
