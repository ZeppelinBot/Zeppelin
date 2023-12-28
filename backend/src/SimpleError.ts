import util from "util";

export class SimpleError extends Error {
  public message: string;

  constructor(message: string) {
    super(message);
  }

  [util.inspect.custom]() {
    return `Error: ${this.message}`;
  }
}
