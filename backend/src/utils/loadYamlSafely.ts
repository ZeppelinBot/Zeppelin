import yaml from "js-yaml";
import { validateNoObjectAliases } from "./validateNoObjectAliases";

/**
 * Loads a YAML file safely while removing object anchors/aliases (including arrays)
 */
export function loadYamlSafely(yamlStr: string): any {
  const loaded = yaml.safeLoad(yamlStr);
  validateNoObjectAliases(loaded);
  return loaded;
}
