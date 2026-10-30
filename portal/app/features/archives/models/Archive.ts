import { ArchiveSchema } from "#database/schema";

export class Archive extends ArchiveSchema {
  static table = "archives";
}

export default Archive;
