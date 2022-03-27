import { trimPluginDescription } from "../../utils";
import { ZeppelinGuildPluginBlueprint } from "../ZeppelinPluginBlueprint";

export const pluginInfo: ZeppelinGuildPluginBlueprint["info"] = {
  prettyName: "Phisherman",
  description: trimPluginDescription(`
    Match scam/phishing links using the Phisherman API. See https://phisherman.gg/ for more details!
  `),
  configurationGuide: trimPluginDescription(`
    ### Getting started
    To get started, request an API key for Phisherman following the instructions at https://docs.phisherman.gg/guide/getting-started.html#requesting-api-access
    Then, add the api key to the plugin's config:
    
    ~~~yml
    phisherman:
      config:
        api_key: "your key here"
    ~~~
    
    ### Note
    When using Phisherman features in Zeppelin, Zeppelin reports statistics about checked links back to Phisherman. This only includes the domain (e.g. zeppelin.gg), not the full link.
    
    ### Usage with Automod
    Once you have configured the Phisherman plugin, you are ready to use it with automod. Currently, Phisherman is available as an option in the \`match_links\` plugin:
    
    ~~~yml
    automod:
      config:
        rules:
          # Clean any scam links detected by Phisherman
          filter_scam_links:
            triggers:
              - match_links:
                  phisherman:
                    include_suspected: true # It's recommended to keep this enabled to catch new scam domains quickly
                    include_verified: true
            actions:
              clean: true
    ~~~
  `),
};
