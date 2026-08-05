import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useMemo } from "preact/hooks";
import {
  DEFAULT_DISCOUNT_CONFIG,
  METAFIELD_KEY,
  METAFIELD_NAMESPACE,
} from "./discount-config.js";

export default async () => {
  render(<App />, document.body);
};

function App() {
  const { applyMetafieldChange, data, i18n } = shopify;
  const { discounts } = shopify;

  const configuredVariantCount = useMemo(() => {
    const existingValue = data?.metafields?.find(
      (metafield) => metafield.key === METAFIELD_KEY,
    )?.value;

    if (!existingValue) {
      return DEFAULT_DISCOUNT_CONFIG.allowedVariantIds.length;
    }

    try {
      const parsed = JSON.parse(existingValue);
      return parsed.allowedVariantIds?.length ?? 0;
    } catch {
      return DEFAULT_DISCOUNT_CONFIG.allowedVariantIds.length;
    }
  }, [data?.metafields]);

  useEffect(() => {
    const discountClasses = discounts?.discountClasses?.value ?? [];

    if (
      discountClasses.length !== 1 ||
      !discountClasses.includes("product")
    ) {
      discounts?.updateDiscountClasses?.(["product"]);
    }
  }, [discounts]);

  async function applyExtensionMetafieldChange() {
    await applyMetafieldChange({
      type: "updateMetafield",
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY,
      value: JSON.stringify(DEFAULT_DISCOUNT_CONFIG),
      valueType: "json",
    });
  }

  return (
    <s-function-settings
      onSubmit={(event) => {
        event.waitUntil?.(applyExtensionMetafieldChange());
      }}
    >
      <s-stack gap="base">
        <s-heading>{i18n.translate("title")}</s-heading>
        <s-banner tone="info">{i18n.translate("description")}</s-banner>
        <s-text>
          {configuredVariantCount} {i18n.translate("variantCountSuffix")}
        </s-text>
        <s-text>{i18n.translate("checkoutMessage")}</s-text>
        <s-text>{i18n.translate("saveHint")}</s-text>
      </s-stack>
    </s-function-settings>
  );
}
