import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect } from "preact/hooks";
import {
  DEFAULT_DISCOUNT_CONFIG,
  METAFIELD_KEY,
  METAFIELD_NAMESPACE,
} from "./discount-config.js";

export default async () => {
  render(<App />, document.body);
};

function App() {
  const { applyMetafieldChange, i18n } = shopify;
  const { discounts } = shopify;

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
        <s-text>{i18n.translate("checkoutMessage")}</s-text>
        <s-text>{i18n.translate("saveHint")}</s-text>
      </s-stack>
    </s-function-settings>
  );
}
