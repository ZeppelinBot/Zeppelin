import { trimPluginDescription } from "../../utils";
import { ZeppelinGuildPluginBlueprint } from "../ZeppelinPluginBlueprint";

export const pluginInfo: ZeppelinGuildPluginBlueprint["info"] = {
  prettyName: "Role buttons",
  description: trimPluginDescription(`
    Allow users to pick roles by clicking on buttons
  `),
  configurationGuide: trimPluginDescription(`
    Button roles are entirely config-based; this is in contrast to the old reaction roles. They can either be added to an existing message posted by Zeppelin or posted as a new message.
    
    ## Basic role buttons
    ~~~yml
    role_buttons:
      config:
        buttons:
          my_roles: # You can use any name you want here, but make sure not to change it afterwards
            message:
              channel_id: "967407495544983552"
              content: "Click the reactions below to get roles! Click again to remove the role."
            options:
              - role_id: "878339100015489044"
                label: "Role 1"
              - role_id: "967410091571703808"
                emoji: "😁" # Default emoji as a unicode emoji
                label: "Role 2"
              - role_id: "967410091571703234"
                emoji: "967412591683047445" # Custom emoji ID
              - role_id: "967410091571703567"
                label: "Role 4"
                style: DANGER # Button style (in all caps), see https://discord.com/developers/docs/interactions/message-components#button-object-button-styles
    ~~~
    
    ### Or with an embed:
    ~~~yml
    role_buttons:
      config:
        buttons:
          my_roles:
            message:
              channel_id: "967407495544983552"
              content:
                embeds:
                  - title: "Pick your role below!"
                    color: 0x0088FF
                    description: "You can pick any role you want by clicking the buttons below."
            options:
              ... # See above for examples for options
    ~~~
    
    ## Role buttons for an existing message
    This message must be posted by Zeppelin.
    ~~~yml
    role_buttons:
      config:
        buttons:
          my_roles:
            message:
              channel_id: "967407495544983552"
              message_id: "967407554412040193"
            options:
              ... # See above for examples for options
    ~~~
    
    ## Limiting to one role ("exclusive" roles)
    When the \`exclusive\` option is enabled, only one role can be selected at a time.
    ~~~yml
    role_buttons:
      config:
        buttons:
          my_roles:
            message:
              channel_id: "967407495544983552"
              message_id: "967407554412040193"
            exclusive: true # With this option set, only one role can be selected at a time
            options:
              ... # See above for examples for options
    ~~~
  `),
};
