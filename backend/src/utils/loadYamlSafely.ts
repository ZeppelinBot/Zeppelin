import yaml from "js-yaml";
import { validateNoObjectAliases } from "./validateNoObjectAliases";

/**
 * Loads a YAML file safely while removing object anchors/aliases (including arrays)
 */
export function loadYamlSafely(yamlStr: string): any {
  let loaded = yaml.safeLoad(yamlStr);
  if (loaded == null || typeof loaded !== "object") {
    loaded = {};
  }
  validateNoObjectAliases(loaded);
  return loaded;
}
