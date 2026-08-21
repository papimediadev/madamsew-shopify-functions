#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
STORE="${1:-madamsew}"

echo "Creating Bundle PDP automatic discount on store: ${STORE}"
shopify app execute -s "$STORE" \
  --query-file scripts/create-bundle-pdp-discount.mutation.graphql \
  --variable-file scripts/create-bundle-pdp-discount.variables.json

echo ""
echo "Creating BYOB automatic discount on store: ${STORE}"
shopify app execute -s "$STORE" \
  --query-file scripts/create-byob-discount.mutation.graphql \
  --variable-file scripts/create-byob-discount.variables.json
