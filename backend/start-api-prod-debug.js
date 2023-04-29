const ClinicHeapProfiler = require('@clinic/heap-profiler');

const heapProfiler = new ClinicHeapProfiler({
  name: `api-${Date.now()}`,
  collectOnFailure: true,
});

console.log("Starting API with heap collection");
heapProfiler.collect([
  "node",
  "-r",
  "./register-tsconfig-paths.js",
  "--unhandled-rejections=strict",
  "--enable-source-maps",
  "--stack-trace-limit=30",
  "dist/backend/src/api/index.js"
], function (err, filepath) {
  if (err) {
    throw err;
  }
  console.log(`Saved collected data in ${filepath}`);
});
