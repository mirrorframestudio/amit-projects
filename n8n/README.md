# Shopify → WhatsApp Order Notification (N8N)

Automated flow: when a customer places an order on Shopify, they receive a WhatsApp confirmation message.

## Architecture

```
Customer orders → Shopify webhook (orders/create) → N8N → WhatsApp Business API → Customer's WhatsApp
```

## 1. Start N8N

From the project root:

```bash
docker compose up -d n8n
```

N8N will be available at **http://localhost:5678**

On first launch, create your N8N owner account.

## 2. Set Up WhatsApp Business API

### Create a Meta Business App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app → select **Business** type
3. Add the **WhatsApp** product to your app
4. In WhatsApp > API Setup:
   - Note your **Phone Number ID** (sender)
   - Generate a **Permanent Access Token** (temporary tokens expire in 24h)
   - Note your **WhatsApp Business Account ID**

### Create a Message Template (required for business-initiated messages)

1. Go to [WhatsApp Manager](https://business.facebook.com/wa/manage/message-templates/)
2. Create a template, e.g. `order_confirmation`
3. Category: **Utility**
4. Add parameters for customer name, order number, total
5. Submit for approval (usually takes minutes to a few hours)

### Add WhatsApp Credentials in N8N

1. In N8N, go to **Settings > Credentials > Add Credential**
2. Search for **WhatsApp Business Cloud**
3. Enter your **Access Token** and **Business Account ID**

## 3. Set Up Shopify Connection

### Option A: Shopify Trigger Node (recommended)

1. In N8N, go to **Settings > Credentials > Add Credential**
2. Search for **Shopify**
3. You'll need:
   - **Shop subdomain** (e.g., `mystore` from `mystore.myshopify.com`)
   - **Access Token**: Create a custom app in Shopify Admin > Settings > Apps > Develop apps
     - Required scopes: `read_orders`
   - **Shared Secret**: Found in your Shopify app's API credentials

### Option B: Manual Webhook

1. In Shopify Admin, go to **Settings > Notifications > Webhooks**
2. Create a webhook for **Order creation**
3. Set the URL to your N8N webhook URL (shown in the Webhook node)

## 4. Import the Workflow

1. In N8N, click **Add Workflow** (+ button)
2. Click the **⋯** menu → **Import from File**
3. Select `n8n/shopify-whatsapp-workflow.json`
4. Update the **Send WhatsApp Message** node with your Phone Number ID
5. Select your WhatsApp credentials in the node
6. **Activate** the workflow (toggle in top right)

## 5. Test

1. Place a test order on your Shopify store (use Shopify's Bogus Gateway for test payments)
2. Ensure the customer has a phone number
3. Check N8N's execution log to verify the workflow triggered
4. Confirm the WhatsApp message was received

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow not triggering | Check that the workflow is **active** and Shopify credentials are correct |
| WhatsApp message fails | Verify your access token hasn't expired; check the phone number format includes country code |
| "Template not found" | You need an approved message template for business-initiated messages |
| Phone number missing | Some customers don't provide phone numbers; the IF node skips these |

## Notes

- WhatsApp Business API requires customers to have WhatsApp installed
- Business-initiated messages require pre-approved templates
- After a customer replies, you have a 24-hour window to send free-form messages
- Meta provides 1,000 free business-initiated conversations per month
