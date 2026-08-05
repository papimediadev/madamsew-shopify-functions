#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORE="${1:-madamsew}"
TOKEN="${SHOPIFY_ADMIN_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set SHOPIFY_ADMIN_TOKEN with an Admin API access token from madamsew."
  echo ""
  echo "How to get it:"
  echo "1. Admin madamsew -> Settings -> Apps and sales channels -> Develop apps"
  echo "2. Create app -> Configure Admin API scopes: read_discounts, write_discounts"
  echo "3. Install app -> Reveal token once"
  echo ""
  echo "Then run:"
  echo "  export SHOPIFY_ADMIN_TOKEN='shpat_...'"
  echo "  bash scripts/create-discount-with-token.sh madamsew"
  exit 1
fi

echo "Creating Best of Madam Sew automatic discount on ${STORE}.myshopify.com ..."

curl -sS -X POST "https://${STORE}.myshopify.com/admin/api/2026-01/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: ${TOKEN}" \
  --data-binary "@${ROOT_DIR}/scripts/create-discount.payload.json"

echo ""
