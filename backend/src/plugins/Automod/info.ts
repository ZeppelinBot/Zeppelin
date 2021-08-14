import { trimPluginDescription } from "../../utils";
import { ZeppelinGuildPluginBlueprint } from "../ZeppelinPluginBlueprint";

export const pluginInfo: ZeppelinGuildPluginBlueprint["info"] = {
  prettyName: "Automod",
  description: trimPluginDescription(`
      Allows specifying automated actions in response to triggers. Example use cases include word filtering and spam prevention.
    `),
  configurationGuide: trimPluginDescription(`
      The automod plugin is very customizable. For a full list of available triggers, actions, and their options, see Config schema at the bottom of this page.    
    
      ### Simple word filter
      Removes any messages that contain the word 'banana' and sends a warning to the user.
      Moderators (level >= 50) are ignored by the filter based on the override.
      
      ~~~yml
      automod:
        config:
          rules:
            my_filter:
              triggers:
              - match_words:
                  words: ['banana']
                  case_sensitive: false
                  only_full_words: true
              actions:
                clean: true
                warn:
                  reason: 'Do not talk about bananas!'
        overrides:
        - level: '>=50'
          config:
            rules:
              my_filter:
                enabled: false
      ~~~
      
      ### Spam detection
      This example includes 2 filters:
      
      - The first one is triggered if a user sends 5 messages within 10 seconds OR 3 attachments within 60 seconds.
        The messages are deleted and the user is muted for 5 minutes.
      - The second filter is triggered if a user sends more than 2 emoji within 5 seconds.
        The messages are deleted but the user is not muted.
      
      Moderators are ignored by both filters based on the override.
      
      ~~~yml
      automod:
        config:
          rules:
            my_spam_filter:
              triggers:
              - message_spam:
                  amount: 5
                  within: 10s
              - attachment_spam:
                  amount: 3
                  within: 60s
              actions:
                clean: true
                mute:
                  duration: 5m
                  reason: 'Auto-muted for spam'
            my_second_filter:
              triggers:
              - emoji_spam:
                  amount: 2
                  within: 5s
              actions:
                clean: true
        overrides:
        - level: '>=50'
          config:
            rules:
              my_spam_filter:
                enabled: false
              my_second_filter:
                enabled: false
      ~~~
      
      ### Custom status alerts
      This example sends an alert any time a user with a matching custom status sends a message.
      
      ~~~yml
      automod:
        config:
          rules:
            bad_custom_statuses:
              triggers:
              - match_words:
                  words: ['banana']
                  match_custom_status: true
              actions:
                alert:
                  channel: "473087035574321152"
                  text: |-
                    Bad custom status on user <@!{user.id}>:
                    {matchSummary}
      ~~~
    `),
};
