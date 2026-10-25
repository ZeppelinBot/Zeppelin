import { rootEnv } from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   */
  connection: 'mysql',

  connections: {
    mysql: {
      client: 'mysql2',

      connection: {
        host: rootEnv.get("DB_HOST", "mysql"),
        port: rootEnv.get("DB_PORT", 3306),
        user: rootEnv.get("DB_USER", "zeppelin"),
        password: rootEnv.get("DB_PASSWORD", rootEnv.get("DEVELOPMENT_MYSQL_PASSWORD", "")),
        database: rootEnv.get("DB_DATABASE", "zeppelin"),
        timezone: "Z",
      },

      migrations: {
        /**
         * Sort migration files naturally by filename.
         */
        naturalSort: true,

        /**
         * Paths containing migration files.
         */
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schemaRules.js'],
        excludeTables: ["migrations"],
      },
    },
  },
})

export default dbConfig
