#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_DIR}"

COMMAND="${1:-watch}"
if [[ $# -gt 0 ]]; then
  shift
fi

echo "Running Clawdwatch command: ${COMMAND}"
npm run "${COMMAND}" -- "$@"
