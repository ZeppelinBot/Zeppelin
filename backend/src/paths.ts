import path from "path";
import pkgUp from "pkg-up";

const backendPackageJson = pkgUp.sync({
  cwd: __dirname,
});

export const backendDir = path.dirname(backendPackageJson);
export const rootDir = path.resolve(backendDir, "..");
