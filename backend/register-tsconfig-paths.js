/**
 * See:
 * https://github.com/dividab/tsconfig-paths
 * https://github.com/TypeStrong/ts-node/issues/138
 * https://github.com/TypeStrong/ts-node/issues/138#issuecomment-519602402
 * https://github.com/TypeStrong/ts-node/pull/254
 */

const path = require("path");
const tsconfig = require("./tsconfig.json");
const tsconfigPaths = require("tsconfig-paths");

// E.g. ./dist/backend
const baseUrl = path.resolve(tsconfig.compilerOptions.outDir, path.basename(__dirname));
tsconfigPaths.register({
  baseUrl,
  paths: tsconfig.compilerOptions.paths || [],
});
