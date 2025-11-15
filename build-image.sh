docker build \
  -t dragory/zeppelin \
  --build-arg COMMIT_HASH=$(git rev-parse HEAD) \
  --build-arg BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  .
