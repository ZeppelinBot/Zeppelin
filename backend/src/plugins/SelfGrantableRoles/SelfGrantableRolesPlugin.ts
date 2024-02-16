import { CooldownManager, PluginOptions } from "knub";
import { trimPluginDescription } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { RoleAddCmd } from "./commands/RoleAddCmd";
import { RoleHelpCmd } from "./commands/RoleHelpCmd";
import { RoleRemoveCmd } from "./commands/RoleRemoveCmd";
import { SelfGrantableRolesPluginType, zSelfGrantableRolesConfig } from "./types";

const defaultOptions: PluginOptions<SelfGrantableRolesPluginType> = {
  config: {
    entries: {},
    mention_roles: false,
  },
};

export const SelfGrantableRolesPlugin = zeppelinGuildPlugin<SelfGrantableRolesPluginType>()({
  name: "self_grantable_roles",
  showInDocs: true,

  info: {
    prettyName: "Self-grantable roles",
    description: trimPluginDescription(`
            Allows users to grant themselves roles via a command
        `),
    configurationGuide: trimPluginDescription(`
      ### Basic configuration
      In this example, users can add themselves platform roles on the channel 473087035574321152 by using the
      \`!role\` command. For example, \`!role pc ps4\` to add both the "pc" and "ps4" roles as specified below.

      ~~~yml
      self_grantable_roles:
        config:
          entries:
            basic:
              roles:
                "543184300250759188": ["pc", "computer"]
                "534710505915547658": ["ps4", "ps", "playstation"]
                "473085927053590538": ["xbox", "xb1", "xb"]
        overrides:
          - channel: "473087035574321152"
            config:
              entries:
                basic:
                  can_use: true
      ~~~

      ### Maximum number of roles
      This is identical to the basic example above, but users can only choose 1 role.

      ~~~yml
      self_grantable_roles:
        config:
          entries:
            basic:
              roles:
                "543184300250759188": ["pc", "computer"]
                "534710505915547658": ["ps4", "ps", "playstation"]
                "473085927053590538": ["xbox", "xb1", "xb"]
              max_roles: 1
        overrides:
          - channel: "473087035574321152"
            config:
              entries:
                basic:
                  can_use: true
      ~~~
    `),
    configSchema: zSelfGrantableRolesConfig,
  },

  configParser: (input) => zSelfGrantableRolesConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    RoleHelpCmd,
    RoleRemoveCmd,
    RoleAddCmd,
  ],

  beforeLoad(pluginData) {
    pluginData.state.cooldowns = new CooldownManager();
  },
});
