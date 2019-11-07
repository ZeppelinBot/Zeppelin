const path = require('path');
const tsconfig = require('./tsconfig.json');
const tsconfigPaths = require('tsconfig-paths');

// E.g. ./dist/backend
const baseUrl = path.resolve(tsconfig.compilerOptions.outDir, path.basename(__dirname));
tsconfigPaths.register({
  baseUrl,
  paths: tsconfig.compilerOptions.paths || [],
});
