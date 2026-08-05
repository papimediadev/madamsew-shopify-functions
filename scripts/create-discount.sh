#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STORE="${1:-madamsew}"

echo "Creating Best of Madam Sew automatic discount on store: ${STORE}"
shopify app execute -s "$STORE" \
  --query-file scripts/create-discount.mutation.graphql \
  --variable-file scripts/create-discount.variables.json
