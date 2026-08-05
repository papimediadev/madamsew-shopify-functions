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
