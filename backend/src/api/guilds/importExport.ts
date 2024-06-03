import { ApiPermissions } from "@zeppelinbot/shared/apiPermissions.js";
import express, { Request, Response } from "express";
import moment from "moment-timezone";
import { z } from "zod";
import { GuildCases } from "../../data/GuildCases.js";
import { Case } from "../../data/entities/Case.js";
import { MINUTES } from "../../utils.js";
import { requireGuildPermission } from "../permissions.js";
import { rateLimit } from "../rateLimits.js";
import { clientError, ok } from "../responses.js";

const caseHandlingModeSchema = z.union([
  z.literal("replace"),
  z.literal("bumpExistingCases"),
  z.literal("bumpImportedCases"),
]);

type CaseHandlingMode = z.infer<typeof caseHandlingModeSchema>;

const caseNoteData = z.object({
  mod_id: z.string(),
  mod_name: z.string(),
  body: z.string(),
  created_at: z.string(),
});

const caseData = z.object({
  case_number: z.number(),
  user_id: z.string(),
  user_name: z.string(),
  mod_id: z.nullable(z.string()),
  mod_name: z.nullable(z.string()),
  type: z.number(),
  created_at: z.string(),
  is_hidden: z.boolean(),
  pp_id: z.nullable(z.string()),
  pp_name: z.nullable(z.string()),
  log_message_id: z.string().optional(),
  notes: z.array(caseNoteData),
});

const importExportData = z.object({
  cases: z.array(caseData),
});
type TImportExportData = z.infer<typeof importExportData>;

export function initGuildsImportExportAPI(guildRouter: express.Router) {
  const importExportRouter = express.Router();

  importExportRouter.get(
    "/:guildId/pre-import",
    requireGuildPermission(ApiPermissions.ManageAccess),
    async (req: Request) => {
      const guildCases = GuildCases.getGuildInstance(req.params.guildId);
      const minNum = await guildCases.getMinCaseNumber();
      const maxNum = await guildCases.getMaxCaseNumber();

      return {
        minCaseNumber: minNum,
        maxCaseNumber: maxNum,
      };
    },
  );

  importExportRouter.post(
    "/:guildId/import",
    requireGuildPermission(ApiPermissions.ManageAccess),
    rateLimit(
      (req) => `import-${req.params.guildId}`,
      5 * MINUTES,
      "A single server can only import data once every 5 minutes",
    ),
    async (req: Request, res: Response) => {
      let data: TImportExportData;
      try {
        data = importExportData.parse(req.body.data);
      } catch (err) {
        const prettyMessage = `${err.issues[0].code}: expected ${err.issues[0].expected}, received ${
          err.issues[0].received
        } at /${err.issues[0].path.join("/")}`;
        return clientError(res, `Invalid import data format: ${prettyMessage}`);
        return;
      }

      let caseHandlingMode: CaseHandlingMode;
      try {
        caseHandlingMode = caseHandlingModeSchema.parse(req.body.caseHandlingMode);
      } catch (err) {
        return clientError(res, "Invalid case handling mode");
        return;
      }

      const seenCaseNumbers = new Set();
      for (const theCase of data.cases) {
        if (seenCaseNumbers.has(theCase.case_number)) {
          return clientError(res, `Duplicate case number: ${theCase.case_number}`);
        }
        seenCaseNumbers.add(theCase.case_number);
      }

      const guildCases = GuildCases.getGuildInstance(req.params.guildId);

      // Prepare cases
      if (caseHandlingMode === "replace") {
        // Replace existing cases
        await guildCases.deleteAllCases();
      } else if (caseHandlingMode === "bumpExistingCases") {
        // Bump existing numbers
        const maxNumberInData = data.cases.reduce((max, theCase) => Math.max(max, theCase.case_number), 0);
        await guildCases.bumpCaseNumbers(maxNumberInData);
      } else if (caseHandlingMode === "bumpImportedCases") {
        const maxExistingNumber = await guildCases.getMaxCaseNumber();
        for (const theCase of data.cases) {
          theCase.case_number += maxExistingNumber;
        }
      }

      // Import cases
      for (const theCase of data.cases) {
        const insertData: any = {
          ...theCase,
          is_hidden: theCase.is_hidden ? 1 : 0,
          guild_id: req.params.guildId,
          notes: undefined,
        };

        const caseInsertData = await guildCases.createInternal(insertData);
        for (const note of theCase.notes) {
          await guildCases.createNote(caseInsertData.identifiers[0].id, note);
        }
      }

      ok(res);
    },
  );

  const exportBatchSize = 500;
  importExportRouter.post(
    "/:guildId/export",
    requireGuildPermission(ApiPermissions.ManageAccess),
    rateLimit(
      (req) => `export-${req.params.guildId}`,
      5 * MINUTES,
      "A single server can only export data once every 5 minutes",
    ),
    async (req: Request, res: Response) => {
      const guildCases = GuildCases.getGuildInstance(req.params.guildId);

      const data: TImportExportData = {
        cases: [],
      };

      let n = 0;
      let cases: Case[];
      do {
        cases = await guildCases.getExportCases(n, exportBatchSize);
        n += cases.length;

        for (const theCase of cases) {
          data.cases.push({
            case_number: theCase.case_number,
            user_id: theCase.user_id,
            user_name: theCase.user_name,
            mod_id: theCase.mod_id,
            mod_name: theCase.mod_name,
            type: theCase.type,
            created_at: theCase.created_at,
            is_hidden: theCase.is_hidden,
            pp_id: theCase.pp_id,
            pp_name: theCase.pp_name,
            log_message_id: theCase.log_message_id ?? undefined,
            notes: theCase.notes.map((note) => ({
              mod_id: note.mod_id,
              mod_name: note.mod_name,
              body: note.body,
              created_at: note.created_at,
            })),
          });
        }
      } while (cases.length === exportBatchSize);

      const filename = `export_${req.params.guildId}_${moment().format("YYYY-MM-DD_HH-mm-ss")}.json`;
      const serialized = JSON.stringify(data, null, 2);

      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Length", serialized.length);
      res.send(serialized);
    },
  );

  guildRouter.use("/", importExportRouter);
}
