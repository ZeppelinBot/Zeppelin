import util from "util";

export class SimpleError extends Error {
  public message: string;

  constructor(message: string) {
    super(message);
  }

  [util.inspect.custom](depth, options) {
    return `Error: ${this.message}`;
  }
}
