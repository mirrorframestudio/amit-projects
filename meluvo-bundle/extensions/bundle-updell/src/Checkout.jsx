import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useSignal } from "@preact/signals";

// ⚠️ החלף עם ה-Variant ID של מוצר הבאנדל (279₪)
// מוצא ב: Shopify Admin → Products → הבאנדל → לחץ על הוואריאנט → העתק מספר מה-URL
const BUNDLE_VARIANT_ID = 'gid://shopify/ProductVariant/REPLACE_ME';

// ה-Tag שהוספת לשני מוצרי המשקפיים
const MIRROR_TAG = 'meluvo-bundle';

export default async () => {
  render(<BundleUpsell />, document.body);
};

function BundleUpsell() {
  const lines = shopify.lines.value;
  const loading = useSignal(false);
  const added = useSignal(false);

  // מצא משקפיים בעגלה לפי tag
  const mirrorLines = lines.filter(line =>
    line.merchandise?.product?.tags?.includes(MIRROR_TAG)
  );

  // הצג רק כשיש בדיוק משקף אחד
  if (mirrorLines.length !== 1) return null;

  async function handleAddBundle() {
    loading.value = true;
    const result = await shopify.applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: BUNDLE_VARIANT_ID,
      quantity: 1,
    });
    loading.value = false;
    if (result.type === 'success') {
      added.value = true;
    }
  }

  // הודעת אישור אחרי הוספה
  if (added.value) {
    return (
      <s-banner heading="✅ חבילת יום+לילה הופעלה!" tone="success">
        <s-text>חסכת 79₪ — נהנה מהמשקפיים!</s-text>
      </s-banner>
    );
  }

  // הצעת הבאנדל
  return (
    <s-banner heading="🌙☀️ שדרג לחבילה יום+לילה" tone="info">
      <s-stack gap="base">
        <s-text>
          יש לך משקף אחד בלבד — קח את שניהם ב-279₪ במקום 358₪ וחסוך 79₪!
        </s-text>
        <s-button onpress={handleAddBundle} disabled={loading.value}>
          {loading.value ? 'מוסיף...' : 'הוסף לחבילה וחסוך 79₪ ←'}
        </s-button>
      </s-stack>
    </s-banner>
  );
}
