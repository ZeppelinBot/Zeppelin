import { load } from "js-yaml";
import YAML from "yawn-yaml/cjs";

const src = `
prefix: '!'

plugins:
  myplugin:
    config:
    
      can_do_thing: true
      
      # Lol
      can_do_other_thing: false
`;

const json = load(src);
const yaml = new YAML(src);
json.plugins.myplugin.config.can_do_thing = false;
yaml.json = json;

console.log(yaml.yaml);
