// tslint:disable:no-console

export const logger = {
  info(...args: Parameters<typeof console.log>) {
    console.log("[INFO]", ...args);
  },

  warn(...args: Parameters<typeof console.warn>) {
    console.warn("[WARN]", ...args);
  },

  error(...args: Parameters<typeof console.error>) {
    console.error("[ERROR]", ...args);
  },

  debug(...args: Parameters<typeof console.log>) {
    console.log("[DEBUG]", ...args);
  },

  log(...args: Parameters<typeof console.log>) {
    console.log(...args);
  },
};
