import { YAMLException } from "js-yaml";
import { validateGuildConfig } from "./configValidator";
import { Configs } from "./data/Configs";
import { connect, disconnect } from "./data/db";
import { loadYamlSafely } from "./utils/loadYamlSafely";
import { ObjectAliasError } from "./utils/validateNoObjectAliases";

function writeError(key: string, error: string) {
  const indented = error
    .split("\n")
    .map((s) => " ".repeat(64) + s)
    .join("\n");
  const prefix = `Invalid config ${key}:`;
  const prefixed = prefix + indented.slice(prefix.length);
  console.log(prefixed + "\n\n");
}

connect().then(async () => {
  const configs = new Configs();
  const activeConfigs = await configs.getActive();
  for (const config of activeConfigs) {
    if (config.key === "global") {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = loadYamlSafely(config.config);
    } catch (err) {
      if (err instanceof ObjectAliasError) {
        writeError(config.key, err.message);
        continue;
      }
      if (err instanceof YAMLException) {
        writeError(config.key, `invalid YAML: ${err.message}`);
        continue;
      }
      throw err;
    }

    const errors = await validateGuildConfig(parsed);
    if (errors) {
      writeError(config.key, errors);
    }
  }

  await disconnect();
  process.exit(0);
});
