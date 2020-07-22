import { Case } from "../../../data/entities/Case";

export function resolveCaseId(caseOrCaseId: Case | number): number {
  return caseOrCaseId instanceof Case ? caseOrCaseId.id : caseOrCaseId;
}
