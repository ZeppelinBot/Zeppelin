import { PortalDataExportSchema } from "#database/schema";

export class PortalDataExport extends PortalDataExportSchema {
  static table = "portal_data_exports";
}

export default PortalDataExport;
