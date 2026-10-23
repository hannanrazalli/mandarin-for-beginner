#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# No host networking, published ports, host mounts, credentials or persistent data.
# Image is the official supported PostgreSQL 17 fixture, not a Supabase runtime.
image='postgres:17-bookworm@sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27'
container="mandarin-rls-${BASHPID}-${RANDOM}"
log="$(mktemp)"
docker_local() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
cleanup() { docker_local rm -f -v "$container" >/dev/null 2>&1 || true; rm -f "$log"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker_local image inspect "$image" >/dev/null 2>&1 || docker_local pull "$image"
docker_local run --detach --name "$container" --network none \
  -e POSTGRES_HOST_AUTH_METHOD=trust "$image" >/dev/null
ready=false
for attempt in {1..60}; do
  if docker_local exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then docker_local logs "$container"; exit 1; fi
sql() { docker_local exec -i "$container" psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d postgres; }
sql < supabase/tests/fixture.sql
for migration in supabase/migrations/*.sql; do sql < "$migration"; done
sql < supabase/tests/rls.sql | tee "$log"
count="$(grep -c '^ok - ' "$log")"
printf 'PASS: %s PostgreSQL security assertions\n' "$count"
docker_local exec "$container" postgres --version
