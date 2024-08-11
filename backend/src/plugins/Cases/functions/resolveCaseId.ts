import { Case } from "../../../data/entities/Case.js";

export function resolveCaseId(caseOrCaseId: Case | number): number {
  return caseOrCaseId instanceof Case ? caseOrCaseId.id : caseOrCaseId;
}
