import { DatabaseColumn, type SchemaRules } from "@adonisjs/lucid/types/schema_generator";

export default {
  types: {
    // We have supportBigNumbers + bigNumberStrings enabled in database.ts, so use "string" for bigints
    // Note: Does not work for primary keys (Lucid's primary key rules override this). See separate primaryKey rule below.
    bigint: {
      tsType: "string",
      decorators: [{ name: "@column" }],
    },
  },

  // Override Lucid's primary key rule so bigints are correctly typed as "string" with supportBigNumbers + bigNumberStrings
  primaryKey: (_tableName: string, primaryKeys: string[], columns: Record<string, DatabaseColumn>) => {
    const columnName = primaryKeys[0];
    if (!columnName || !columns[columnName]) {
      return undefined;
    }

    const column = columns[columnName];
    let tsType: string;
    if (/^bigint\b/.test(column.type)) {
      tsType = "string";
    } else if (/^(tinyint|smallint|mediumint|int|integer)\b/.test(column.type)) {
      tsType = "number";
    } else if (/^(char|varchar|uuid)\b/.test(column.type)) {
      tsType = "string";
    } else {
      throw new Error(`Unsupported primary key type: ${column.type}`);
    }

    return {
      columnName,
      columnInfo: {
        tsType,
        decorators: [{ name: "@column", args: { isPrimary: true } }],
      },
    };
  },
} satisfies SchemaRules;
