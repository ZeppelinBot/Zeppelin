import { Case } from "./entities/Case";
import { CaseNote } from "./entities/CaseNote";
import { BaseRepository } from "./BaseRepository";
import { getRepository, In, Repository } from "typeorm";
import { disableLinkPreviews } from "../utils";
import { CaseTypes } from "./CaseTypes";

const CASE_SUMMARY_REASON_MAX_LENGTH = 300;

export class GuildCases extends BaseRepository {
  private cases: Repository<Case>;
  private caseNotes: Repository<CaseNote>;

  constructor(guildId) {
    super(guildId);
    this.cases = getRepository(Case);
    this.caseNotes = getRepository(CaseNote);
  }

  async get(ids: number[]): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        id: In(ids),
      },
    });
  }

  async find(id: number): Promise<Case> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        id,
      },
    });
  }

  async findByCaseNumber(caseNumber: number): Promise<Case> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        case_number: caseNumber,
      },
    });
  }

  async findLatestByModId(modId: string): Promise<Case> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        mod_id: modId,
      },
      order: {
        case_number: "DESC",
      },
    });
  }

  async getByUserId(userId: string): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async getRecent(count: number): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        is_hidden: 0,
      },
      take: count,
      order: {
        case_number: "DESC",
      },
    });
  }

  async setHidden(id: number, hidden: boolean): Promise<void> {
    await this.cases.update(
      { id },
      {
        is_hidden: hidden,
      },
    );
  }

  async create(data): Promise<Case> {
    const result = await this.cases.insert({
      ...data,
      guild_id: this.guildId,
      case_number: () => `(SELECT IFNULL(MAX(case_number)+1, 1) FROM cases AS ma2 WHERE guild_id = ${this.guildId})`,
    });

    return this.find(result.identifiers[0].id);
  }

  update(id, data) {
    return this.cases.update(id, data);
  }

  async createNote(caseId: number, data: any): Promise<void> {
    await this.caseNotes.insert({
      ...data,
      case_id: caseId,
    });
  }

  getSummaryText(theCase: Case) {
    const firstNote = theCase.notes[0];
    let reason = firstNote ? firstNote.body : "";

    if (reason.length > CASE_SUMMARY_REASON_MAX_LENGTH) {
      const match = reason.slice(CASE_SUMMARY_REASON_MAX_LENGTH, 100).match(/(?:[.,!?\s]|$)/);
      const nextWhitespaceIndex = match ? CASE_SUMMARY_REASON_MAX_LENGTH + match.index : CASE_SUMMARY_REASON_MAX_LENGTH;
      if (nextWhitespaceIndex < reason.length) {
        reason = reason.slice(0, nextWhitespaceIndex - 1) + "...";
      }
    }

    reason = disableLinkPreviews(reason);

    let line = `Case \`#${theCase.case_number}\` __${CaseTypes[theCase.type]}__ ${reason}`;
    if (theCase.notes.length > 1) {
      line += ` *(+${theCase.notes.length - 1} ${theCase.notes.length === 2 ? "note" : "notes"})*`;
    }

    if (theCase.is_hidden) {
      line += " *(hidden)*";
    }

    return line;
  }
}
