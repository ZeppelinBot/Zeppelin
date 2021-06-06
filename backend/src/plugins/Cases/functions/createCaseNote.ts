import { GuildPluginData } from "knub";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { resolveUser, UnknownUser } from "../../../utils";
import { CaseNoteArgs, CasesPluginType } from "../types";
import { postCaseToCaseLogChannel } from "./postToCaseLogChannel";
import { resolveCaseId } from "./resolveCaseId";

export async function createCaseNote(pluginData: GuildPluginData<CasesPluginType>, args: CaseNoteArgs): Promise<void> {
  const theCase = await pluginData.state.cases.find(resolveCaseId(args.caseId));
  if (!theCase) {
    throw new RecoverablePluginError(ERRORS.UNKNOWN_NOTE_CASE);
  }

  const mod = await resolveUser(pluginData.client, args.modId);
  if (mod instanceof UnknownUser) {
    throw new RecoverablePluginError(ERRORS.INVALID_USER);
  }

  const modName = `${mod.username}#${mod.discriminator}`;

  let body = args.body;

  // Add note details to the beginning of the note
  if (args.noteDetails && args.noteDetails.length) {
    body = args.noteDetails.map(d => `__[${d}]__`).join(" ") + " " + body;
  }

  await pluginData.state.cases.createNote(theCase.id, {
    mod_id: mod.id,
    mod_name: modName,
    body: body || "",
  });

  if (theCase.mod_id == null) {
    // If the case has no moderator information, assume the first one to add a note to it did the action
    await pluginData.state.cases.update(theCase.id, {
      mod_id: mod.id,
      mod_name: modName,
    });
  }

  const archiveLinkMatch = body && body.match(/(?<=\/archives\/)[a-zA-Z0-9\-]+/g);
  if (archiveLinkMatch) {
    for (const archiveId of archiveLinkMatch) {
      pluginData.state.archives.makePermanent(archiveId);
    }
  }

  const modConfig = await pluginData.config.getForUser(mod);
  if (
    args.postInCaseLogOverride === true ||
    ((!args.automatic || modConfig.log_automatic_actions) && args.postInCaseLogOverride !== false)
  ) {
    await postCaseToCaseLogChannel(pluginData, theCase.id);
  }
}
