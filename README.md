# Madam Sew Shopify Functions

Shopify app repository for Madam Sew checkout customizations.

## Extensions

### `best-of-madamsew-discount`

Automatic product discount for the Best of Madam Sew A/B test landing (`/pages/best-of-madam-sew`).

#### Business rules

- Applies only to cart lines with line item property `_bestofmadamsew = true`.
- Applies only to configured eligible variant IDs (10 individual tools from the landing).
- Excludes the bundle SKU by omitting its variant IDs from config.
- Discount tier is based on total eligible quantity in cart:
  - 1 item → 5%
  - 2 items → 10%
  - 3 items → 15%
  - 4 items → 20%
  - 5+ items → 25% on each eligible line
- Checkout line discount message: `BESTOFMADAMSEW`

#### Theme contract

The theme adds `_bestofmadamsew: true` only for Intelligems variant traffic on the landing page.

#### Discount configuration metafield

Namespace: `$app:best-of-madamsew-discount`  
Key: `config`

Example value: see `extensions/best-of-madamsew-discount/config/discount-config.example.json`.

Populate `allowedVariantIds` with Shopify ProductVariant GIDs from the 10 individual products shown on the landing. Do not include the bundle variant GID.

#### Local development

```bash
cd extensions/best-of-madamsew-discount
npm install
npm run typegen
npm test
npm run build
```

From repo root:

```bash
npm install
npm run build
shopify app dev
```

#### Create automatic discount in Shopify Admin

1. Link the app to the Madam Sew store (`shopify app dev` or Partner Dashboard).
2. Deploy the extension when ready (`shopify app deploy`).
3. Create an automatic app discount using the `best-of-madamsew-discount` function.
4. Set discount class to **Product**.
5. Save the function configuration metafield with the allowed variant IDs.

#### Product handles reference (theme side)

- `wool-pressing-mat`
- `multi-pocket-binder-bag-6-binder-pockets`
- `quilt-storage-bag-large-size-23-l-x-20-w-x-11-h`
- `wooden-desktop-scissors-stand-holds-up-to-5-pairs-of-shears`
- `sewing-machine-light-strip`
- `project-bag-store-everything-for-your-project-in-one-place`
- `binder-pocket-6-pack-organize-your-sewing-projects-easily`
- `sewing-machine-muffling-mat-reduces-sewing-machine-vibrations-movement-and-slipping`
- `seam-guide-ruler-1-free-magnetic-seam-guide`
- `sewing-machine-pedal-mat-evergreen`

Bundle excluded: `best-of-madam-sew-favourite-tools-with-3-light-pink-project-bags`

### `warehouse-clearance-discount`

Automatic product discount for the Warehouse Clearance A/B test landing (`/pages/warehouse-clearance-sale-2026`).

#### Business rules

- Applies only to cart lines with line item property `_warehouseclearance = true`.
- Applies only to configured eligible variant IDs from the landing (25 products / all of their variants).
- Discount tier is based on total eligible quantity in cart:
  - 1 item → 5%
  - 2 items → 10%
  - 3 items → 15%
  - 4 items → 20%
  - 5+ items → 25% on each eligible line
- Checkout line discount message: `WAREHOUSECLEARANCE`

#### Theme contract

The theme adds `_warehouseclearance: true` only when Intelligems adds `body.warehouseclearance-gamification-enabled` on the landing page.

#### Discount configuration metafield

Namespace: `$app:warehouse-clearance-discount`  
Key: `config`

Example value: see `extensions/warehouse-clearance-discount/config/discount-config.example.json`.

#### Local development

```bash
cd extensions/warehouse-clearance-discount
npm install
npm run typegen
npm test
npm run build
```

#### Create automatic discount in Shopify Admin

1. Deploy the extension (`shopify app deploy`).
2. Create an automatic app discount using the `warehouse-clearance-discount` function.
3. Set discount class to **Product**.
4. Save the function configuration metafield with the allowed variant IDs.

Or after deploy:

```bash
export WAREHOUSE_CLEARANCE_FUNCTION_ID='gid://shopify/ShopifyFunction/...'
# then set functionId in scripts/create-warehouse-clearance-discount.variables.json
bash scripts/create-warehouse-clearance-discount.sh madamsew
```

#### Intelligems

Add body class `warehouseclearance-gamification-enabled` on the treatment variant of `/pages/warehouse-clearance-sale-2026`.

### `bundle-pdp-discount`

Automatic product discount for Buy more, Save more bundles on PDP (`snippets/bundle-pdp.liquid`).

#### Business rules

- Applies only to cart lines with line item property `bundle_id = bundle-pdp`.
- Groups lines by product and sums quantity across variants.
- Reads tier config from line properties: `qty_0|discount_0`, `qty_1|discount_1`, `qty_2|discount_2`.
- Applies the highest tier where total quantity meets or exceeds the tier quantity.
- Default tiers: 2 → 10%, 4 → 15%, 6 → 20%.
- Project Bag tiers: 3 → 11%, 6 → 31%, 9 → 41%.
- Checkout line discount message: `Bundle PDP`

#### Theme contract

The theme sets bundle line properties in `src/js/bundle-pdp.js`. No theme changes required for checkout.

#### Admin setup

1. Deploy the extension (`shopify app deploy`).
2. Ensure **Madam Sew Functions - P dev** is installed on the store (Partner Dashboard → App → Test on development store, or Admin → Apps).
3. Go to **Admin → Discounts → Create discount** (not the app home page).
4. Choose **Bundle PDP Discount** from **Madam Sew Functions - P dev**.
5. Set discount class to **Product**, then save.

Or create via script after deploy (requires Admin API token):

```bash
export SHOPIFY_ADMIN_TOKEN='shpat_...'
bash scripts/list-functions.sh madamsew
export BUNDLE_PDP_FUNCTION_ID='gid://shopify/ShopifyFunction/...'
bash scripts/create-script-editor-discounts-cli.sh madamsew
```

---

### `byob-discount`

Automatic product discount for Build Your Own Bundle (`all-for-byob` and BYOB widgets).

#### Business rules

- Applies to cart lines with line item property `type` or `Type` containing `Bundle Product`.
- Counts total quantity across all BYOB lines in the cart.
- 5+ items → 10% on each BYOB line.
- 7+ items → 15% on each BYOB line.
- Checkout line discount message: `BYOB Bundle`

#### Theme contract

The theme sets `properties.type = 'Bundle Product'` in `snippets/byob.liquid` and `sections/product-bundle.liquid`.

#### Admin setup

1. Deploy the extension (`shopify app deploy`).
2. Ensure **Madam Sew Functions - P dev** is installed on the store.
3. Go to **Admin → Discounts → Create discount**.
4. Choose **BYOB Discount** from **Madam Sew Functions - P dev**.
5. Set discount class to **Product**, then save.

Or use `scripts/create-script-editor-discounts.sh` with `BYOB_FUNCTION_ID` from `scripts/list-functions.sh`.

