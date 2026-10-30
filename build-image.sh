TAG=${1:-latest}

docker build \
  -t "dragory/zeppelin:$TAG" \
  --pull \
  --build-arg COMMIT_HASH=$(git rev-parse HEAD) \
  --build-arg BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  .
