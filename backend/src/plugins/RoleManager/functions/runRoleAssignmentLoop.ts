import { GuildPluginData } from "knub";
import { RoleManagerPluginType } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { logger } from "../../../logger";
import { RoleQueueItem } from "../../../data/entities/RoleQueueItem";

const ROLE_ASSIGNMENTS_PER_BATCH = 20;

export async function runRoleAssignmentLoop(pluginData: GuildPluginData<RoleManagerPluginType>) {
  if (pluginData.state.roleAssignmentLoopRunning || pluginData.state.abortRoleAssignmentLoop) {
    return;
  }
  pluginData.state.roleAssignmentLoopRunning = true;

  while (true) {
    // Abort on unload
    if (pluginData.state.abortRoleAssignmentLoop) {
      break;
    }

    if (!pluginData.state.roleAssignmentLoopRunning) {
      break;
    }

    await (pluginData.state.pendingRoleAssignmentPromise = (async () => {
      // Process assignments in batches, stopping once the queue's exhausted
      const nextAssignments = await pluginData.state.roleQueue.consumeNextRoleAssignments(ROLE_ASSIGNMENTS_PER_BATCH);
      if (nextAssignments.length === 0) {
        pluginData.state.roleAssignmentLoopRunning = false;
        return;
      }

      // Remove assignments that cancel each other out (e.g. from spam-clicking a role button)
      const validAssignments = new Map<string, RoleQueueItem>();
      for (const assignment of nextAssignments) {
        const key = `${assignment.should_add ? 1 : 0}|${assignment.user_id}|${assignment.role_id}`;
        const oppositeKey = `${assignment.should_add ? 0 : 1}|${assignment.user_id}|${assignment.role_id}`;
        if (validAssignments.has(oppositeKey)) {
          validAssignments.delete(oppositeKey);
          continue;
        }
        validAssignments.set(key, assignment);
      }

      // Apply batch in parallel
      await Promise.all(
        Array.from(validAssignments.values()).map(async (assignment) => {
          const member = await pluginData.guild.members.fetch(assignment.user_id).catch(() => null);
          if (!member) {
            return;
          }

          const operation = assignment.should_add
            ? member.roles.add(assignment.role_id)
            : member.roles.remove(assignment.role_id);

          await operation.catch((err) => {
            logger.warn(err);
            pluginData.getPlugin(LogsPlugin).logBotAlert({
              body: `Could not ${assignment.should_add ? "assign" : "remove"} role <@&${assignment.role_id}> (\`${
                assignment.role_id
              }\`) ${assignment.should_add ? "to" : "from"} <@!${assignment.user_id}> (\`${assignment.user_id}\`)`,
            });
          });
        }),
      );
    })());
  }
}
