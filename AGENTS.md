The project is called Zeppelin. It's a Discord bot that uses Discord.js. The bot is built on the Vety framework (formerly called Knub).

This repository is a monorepository that contains these projects:
1. **Backend**: The shared codebase of the bot and API. Located in `backend`.
2. **Dashboard**: The web dashboard that contains the bot's management interface and documentation. Located in `dashboard`.
3. **Config checker**: A tool to check the configuration of the bot. Located in `config-checker`.

There is also a `shared` folder that contains shared code used by all projects, such as types and utilities.

# Backend
The backend codebase is located in the `backend` directory. It contains the main bot code, API code, and shared code used by both the bot and API.
Zeppelin's functionality is split into plugins, which are located in the `src/plugins` directory.
Each plugin has its own directory, with a `types.ts` for config types, `docs.ts` for a `ZeppelinPluginDocs` structure, and the plugin's main file.
Each plugin has an internal name, such as "common". In this example, the folder would be `src/plugins/Common` (note the capitalization). The plugin's main file would be `src/plugins/CommonPlugin.ts`.
There are two types of plugins: "guild plugins" and "global plugins". Guild plugins are loaded on a per-guild basis, while global plugins are loaded once for the entire bot.
Plugins can specify dependencies on other plugins and call their public methods. Likewise, plugins can specify public methods in the main file.
Available plugins are specified in `src/plugins/availablePlugins.ts`.

Zeppelin's data layer uses TypeORM. Entities are located in `src/data/entities`, while repositories are in `src/data`. If the repository name is prefixed with "Guild", it's a guild-specific repository. If it's prefixed with "User", it's a user-specific repository. If it has no prefix, it's a global repository.

Environment variables are parsed in `src/env.ts`.
