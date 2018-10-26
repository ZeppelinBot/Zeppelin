import util from "util";

export class SimpleError {
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  [util.inspect.custom](depth, options) {
    return `Error: ${this.message}`;
  }
}
