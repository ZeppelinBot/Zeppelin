import { asSingleLine, trimLines } from "../../../utils";
import { selfGrantableRolesCmd } from "../types";
import { getApplyingEntries } from "../util/getApplyingEntries";

export const RoleHelpCmd = selfGrantableRolesCmd({
  trigger: ["role help", "role"],
  permission: null,

  async run({ message: msg, pluginData }) {
    const applyingEntries = await getApplyingEntries(pluginData, msg);
    if (applyingEntries.length === 0) return;

    const allPrimaryAliases: string[] = [];
    for (const entry of applyingEntries) {
      for (const aliases of Object.values(entry.roles)) {
        if (aliases[0]) {
          allPrimaryAliases.push(aliases[0]);
        }
      }
    }

    const prefix = pluginData.fullConfig.prefix;
    const [firstRole, secondRole] = allPrimaryAliases;

    const help1 = asSingleLine(`
      To give yourself a role, type e.g. \`${prefix}role ${firstRole}\` where **${firstRole}** is the role you want.
      ${secondRole ? `You can also add multiple roles at once, e.g. \`${prefix}role ${firstRole} ${secondRole}\`` : ""}
    `);

    const help2 = asSingleLine(`
      To remove a role, type \`${prefix}role remove ${firstRole}\`,
      again replacing **${firstRole}** with the role you want to remove.
    `);

    const helpMessage = trimLines(`
      ${help1}

      ${help2}

      **Roles available to you:**
      ${allPrimaryAliases.join(", ")}
    `);

    const helpEmbed = {
      title: "How to get roles",
      description: helpMessage,
      color: parseInt("42bff4", 16),
    };

    msg.channel.send({ embeds: [helpEmbed] });
  },
});
