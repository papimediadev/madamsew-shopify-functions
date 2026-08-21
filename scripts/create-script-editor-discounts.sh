#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORE="${1:-madamsew}"
TOKEN="${SHOPIFY_ADMIN_TOKEN:-}"
BUNDLE_PDP_FUNCTION_ID="${BUNDLE_PDP_FUNCTION_ID:-}"
BYOB_FUNCTION_ID="${BYOB_FUNCTION_ID:-}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set SHOPIFY_ADMIN_TOKEN with an Admin API access token."
  echo ""
  echo "Then list deployed functions:"
  echo "  export SHOPIFY_ADMIN_TOKEN='shpat_...'"
  echo "  bash scripts/list-functions.sh madamsew"
  echo ""
  echo "Set function IDs from the output and run:"
  echo "  export BUNDLE_PDP_FUNCTION_ID='gid://shopify/ShopifyFunction/...'"
  echo "  export BYOB_FUNCTION_ID='gid://shopify/ShopifyFunction/...'"
  echo "  bash scripts/create-script-editor-discounts.sh madamsew"
  exit 1
fi

if [[ -z "$BUNDLE_PDP_FUNCTION_ID" || -z "$BYOB_FUNCTION_ID" ]]; then
  echo "Listing functions to help pick IDs..."
  bash "${ROOT_DIR}/scripts/list-functions.sh" "$STORE"
  echo ""
  echo "ERROR: Set BUNDLE_PDP_FUNCTION_ID and BYOB_FUNCTION_ID before running."
  exit 1
fi

create_discount() {
  local title="$1"
  local function_id="$2"

  local payload
  payload=$(cat <<EOF
{
  "query": "mutation CreateAutomaticAppDiscount(\$automaticAppDiscount: DiscountAutomaticAppInput!) { discountAutomaticAppCreate(automaticAppDiscount: \$automaticAppDiscount) { automaticAppDiscount { discountId title status } userErrors { field message } } }",
  "variables": {
    "automaticAppDiscount": {
      "title": "${title}",
      "functionId": "${function_id}",
      "startsAt": "2025-01-01T00:00:00",
      "discountClasses": ["PRODUCT"],
      "combinesWith": {
        "orderDiscounts": false,
        "productDiscounts": false,
        "shippingDiscounts": true
      },
      "metafields": [
        {
          "namespace": "\$app",
          "key": "config",
          "type": "json",
          "value": "{}"
        }
      ]
    }
  }
}
EOF
)

  echo "Creating ${title}..."
  curl -sS -X POST "https://${STORE}.myshopify.com/admin/api/2026-01/graphql.json" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Access-Token: ${TOKEN}" \
    -d "$payload" \
    | python -m json.tool 2>/dev/null || cat
  echo ""
}

create_discount "Bundle PDP Discount" "$BUNDLE_PDP_FUNCTION_ID"
create_discount "BYOB Discount" "$BYOB_FUNCTION_ID"

echo "Done."
