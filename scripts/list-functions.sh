#!/usr/bin/env bash
set -euo pipefail

STORE="${1:-madamsew}"
TOKEN="${SHOPIFY_ADMIN_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set SHOPIFY_ADMIN_TOKEN first."
  exit 1
fi

echo "Listing Shopify Functions on ${STORE}.myshopify.com ..."
echo ""

curl -sS -X POST "https://${STORE}.myshopify.com/admin/api/2026-01/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: ${TOKEN}" \
  -d '{"query":"{ shopifyFunctions(first: 25) { nodes { id title apiType app { title } } } }"}' \
  | python -m json.tool 2>/dev/null || cat

echo ""
