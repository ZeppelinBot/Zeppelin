const ClinicHeapProfiler = require('@clinic/heap-profiler');

const heapProfiler = new ClinicHeapProfiler({
  name: `bot-${Date.now()}`,
  collectOnFailure: true,
});

console.log("Starting bot with heap collection");
heapProfiler.collect([
  "node",
  "-r",
  "./register-tsconfig-paths.js",
  "--unhandled-rejections=strict",
  "--enable-source-maps",
  "--stack-trace-limit=30",
  "dist/backend/src/index.js"
], function (err, filepath) {
  if (err) {
    throw err;
  }
  console.log(`Saved collected data in ${filepath}`);
});
