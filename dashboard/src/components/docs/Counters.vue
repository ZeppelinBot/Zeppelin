<template>
  <div>
    <h1>Counters</h1>
    <p>
      Counters are an advanced feature in Zeppelin that allows you keep track of per-user, per-channel, or global numbers and trigger specific actions based on this number.
      Common use cases are infraction points, XP systems, activity roles, and so on.
    </p>
    <p>
      This guide will be expanded in the future. For now, it contains examples of common counter use cases.
      Also see the <router-link to="/docs/plugins/counters">documentation for the Counters plugin.</router-link>
    </p>

    <h2>Examples</h2>

    <h3>Infraction points</h3>
    <p>
      In this example, warns, mutes, and kicks all accumulate "infraction points" for a user.
      When the user reaches too many points, they are automatically banned.
    </p>

    <Expandable class="wide">
      <template v-slot:title>Click to view example</template>
      <template v-slot:content>
        <CodeBlock code-lang="yaml">
          plugins:

            counters:
              config:
                counters:

                  infraction_points:
                    per_user: true
                    triggers:
                      # When a user accumulates 50 or more (>=50) infraction points, this trigger will activate.
                      # The numbers here are arbitrary - you could choose to use 5 or 500 instead, depending on the granularity you want.
                      autoban:
                        condition: ">=50"
                    # Remove 1 infraction point each day
                    decay:
                      amount: 1
                      every: 24h

            automod:
              config:
                rules:

                  add_infraction_points_on_warn:
                    triggers:
                      - warn: {}
                    actions:
                      add_to_counter:
                        counter: "infraction_points"
                        amount: 10

                  add_infraction_points_on_mute:
                    triggers:
                      - mute: {}
                    actions:
                      add_to_counter:
                        counter: "infraction_points"
                        amount: 20

                  add_infraction_points_on_kick:
                    triggers:
                      - kick: {}
                    actions:
                      add_to_counter:
                        counter: "infraction_points"
                        amount: 40

                  autoban_on_too_many_infraction_points:
                    triggers:
                      # The counter trigger we specified further above, "autoban", is used to trigger an automod rule here
                      - counter_trigger:
                          counter: "infraction_points"
                          trigger: "autoban"
                    actions:
                      ban:
                        reason: "Too many infraction points"
        </CodeBlock>
      </template>
    </Expandable>

    <h3>Escalating automod punishments</h3>
    <p>
      This example allows users to trigger the `some_infraction` automod rule 3 times. On the 4th time, they are automatically muted.
    </p>

    <Expandable class="wide">
      <template v-slot:title>Click to view example</template>
      <template v-slot:content>
        <CodeBlock code-lang="yaml">
          plugins:

            counters:
              config:
                counters:

                  automod_infractions:
                    per_user: true
                    triggers:
                      # When a user accumulates 100 or more (>=100) automod infraction points, this trigger will activate
                      # The numbers here are arbitrary - you could choose to use 10 or 1000 instead.
                      too_many_infractions:
                        condition: ">=100"
                    # Remove 100 automod infraction points per hour
                    decay:
                      amount: 100
                      every: 1h

            automod:
              config:
                rules:

                  # An example automod rule that adds automod infraction points
                  some_infraction:
                    triggers:
                      - match_words:
                          words: ['poopoo head']

                    actions:
                      clean: true
                      reply: 'Do not insult other users'
                      add_to_counter:
                        counter: "automod_infractions"
                        amount: 25 # This infraction adds 25 automod infraction points

                  # An example rule that is triggered when the user accumulates too many automod infraction points
                  automute_on_too_many_infractions:
                    triggers:
                      - counter_trigger:
                          counter: "automod_infractions"
                          trigger: "too_many_infractions"

                    actions:
                      mute:
                        reason: "You have been muted for tripping too many automod filters"
                        remove_roles_on_mute: true
                        restore_roles_on_unmute: true
        </CodeBlock>
      </template>
    </Expandable>

    <h3>Simple XP system</h3>
    <p>
      This example creates an XP system where every message sent grants you 1 XP, max once per minute.
      At 100, 250, 500, and 1000 XP the system grants the user a new role.
    </p>

    <Expandable class="wide">
      <template v-slot:title>Click to view example</template>
      <template v-slot:content>
        <CodeBlock code-lang="yaml">
          plugins:

            counters:
              config:
                counters:
                  xp:
                    per_user: true
                    triggers:
                      role_1:
                        condition: ">=100"
                      role_2:
                        condition: ">=250"
                      role_3:
                        condition: ">=500"
                      role_4:
                        condition: ">=1000"

            automod:
              config:
                rules:

                  accumulate_xp:
                    triggers:
                      - any_message: {}

                    actions:
                      log: false # Don't spam logs with XP changes
                      add_to_counter:
                        counter: "xp"
                        amount: 1 # Each message adds 1 XP

                    cooldown: 1m # Only count 1 message per minute

                  add_xp_role_1:
                    triggers:
                      - counter_trigger:
                          counter: "xp"
                          trigger: "role_1"

                    actions:
                      add_roles: ["123456789123456789"] # Role ID for xp role 1

                  add_xp_role_2:
                    triggers:
                      - counter_trigger:
                          counter: "xp"
                          trigger: "role_2"

                    actions:
                      add_roles: ["123456789123456789"] # Role ID for xp role 2

                  add_xp_role_3:
                    triggers:
                      - counter_trigger:
                          counter: "xp"
                          trigger: "role_3"

                    actions:
                      add_roles: ["123456789123456789"] # Role ID for xp role 3

                  add_xp_role_4:
                    triggers:
                      - counter_trigger:
                          counter: "xp"
                          trigger: "role_4"

                    actions:
                      add_roles: ["123456789123456789"] # Role ID for xp role 4
        </CodeBlock>
      </template>
    </Expandable>

    <h3>Activity role ("regular role")</h3>
    <p>
      This example is similar to the XP system, but the number decays and the role granted by the system can be removed if the user's activity goes down.
    </p>

    <Expandable class="wide">
      <template v-slot:title>Click to view example</template>
      <template v-slot:content>
        <CodeBlock code-lang="yaml">
          plugins:

            counters:
              config:
                counters:
                  activity:
                    per_user: true
                    triggers:
                      grant_role:
                        condition: ">=100"
                        # We set a separate threshold for when the role should be removed. This is so the decay doesn't remove the activity role immediately.
                        # If this value isn't set, reverse_condition defaults to the opposite of the condition, i.e. "<100" in this case.
                        reverse_condition: "<50"
                    decay:
                      amount: 1
                      every: 1h

            automod:
              config:
                rules:

                  accumulate_activity:
                    triggers:
                      - any_message: {}

                    actions:
                      log: false # Don't spam logs with activity changes
                      add_to_counter:
                        counter: "activity"
                        amount: 1 # Each message adds 1 to the counter

                    cooldown: 1m # Only count 1 message per minute

                  grant_activity_role:
                    triggers:
                      - counter_trigger:
                          counter: "activity"
                          trigger: "grant_role"

                    actions:
                      add_roles: ["123456789123456789"] # Role ID for activity role

                  remove_activity_role:
                    triggers:
                      - counter_trigger:
                          counter: "activity"
                          trigger: "grant_role"
                          reverse: true # This indicates we want to use the *reverse* of the specified trigger, see reverse_condition in counters above

                    actions:
                      remove_roles: ["123456789123456789"] # Role ID for activity role
        </CodeBlock>
      </template>
    </Expandable>

    <h3>Auto-disable antiraid</h3>
    <p>
      This example disables antiraid after a specific delay.
    </p>

    <Expandable class="wide">
      <template v-slot:title>Click to view example</template>
      <template v-slot:content>
        <CodeBlock code-lang="yaml">
          plugins:

            counters:
              config:
                counters:

                  antiraid_decay:
                    triggers:
                      disable:
                        condition: "=0"
                    decay:
                      amount: 1
                      every: 1m

            automod:
              config:
                rules:

                  start_antiraid_timer_low:
                    triggers:
                      - antiraid_level:
                          level: "low"
                    actions:
                      set_counter:
                        counter: "antiraid_decay"
                        amount: 10 # "Disable after 10min"

                  start_antiraid_timer_high:
                    triggers:
                      - antiraid_level:
                          level: "high"
                    actions:
                      set_counter:
                        counter: "antiraid_decay"
                        amount: 20 # "Disable after 20min"

                  disable_antiraid_after_timer:
                    triggers:
                      - counter_trigger:
                          counter: "antiraid_decay"
                          trigger: "disable"
                    actions:
                      set_antiraid_level: null
        </CodeBlock>
      </template>
    </Expandable>
  </div>
</template>

<script>
import CodeBlock from "./CodeBlock";
import Expandable from "../Expandable";

export default {
  components: { CodeBlock, Expandable },
};
</script>
