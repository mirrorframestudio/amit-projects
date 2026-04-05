# OneZoneJersey — WhatsApp Remarketing Automation

## Overview

**Goal:** 21 days after an order is shipped ("Sent"), automatically send a WhatsApp
remarketing message via JONI with discount code **זון15** (15% off).

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│  MONDAY.COM (Automation #1)                                 │
│  When Status changes from "Working on it" to "Sent"         │
│  → Set Sent Date = Today                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓ (21 days pass)
┌─────────────────────────────────────────────────────────────┐
│  MAKE.COM (Scheduled scenario, daily 18:00 Israel)          │
│  Search: Status=Sent, Remarketing≠Messaged, Sent Date ≤21d │
│  → Parse phone number                                        │
│  → JONI sends WhatsApp message                               │
│  → Update Remarketing Status to "Messaged"                   │
└─────────────────────────────────────────────────────────────┘
```

**Fully automatic** — no manual steps needed (as long as WhatsApp Web + JONI Chrome extension are open).

---

## Part A — Monday.com Board Setup (DONE ✅)

### Columns on the "Orders" board

| Column Name         | Type   | Status |
|---------------------|--------|--------|
| Status              | Status | ✅ Exists (has "Sent") |
| Phone               | Phone  | ✅ Exists (+972…) |
| Remarketing Status  | Status | ✅ Exists (has "Messaged" + "Ready to Send") |
| Email               | Email  | ✅ Exists |
| Sent Date           | Date   | ✅ Created |

---

## Part B — Monday.com Automation #1 (DONE ✅)

**Recipe:** When Status changes from "Working on it" to "Sent" → Set Sent Date to Today

> Note: Monday only allows "from Working on it to Sent" (not "from any to Sent").
> This is fine as long as orders go through that flow.

---

## Part C — Make.com Scenario (DONE ✅)

### Scenario: "OneZone Remarketing 21 Day"

**Module 1 — Monday.com: Search Items by Column Values**

| Setting | Value |
|---------|-------|
| Board | Orders (ID: 2131896795) |
| Column | Status |
| Value | `Sent` |
| Limit | 50 |

**Filter — "Eligible"**

All conditions use AND logic:

| # | Field | Operator | Value |
|---|-------|----------|-------|
| 1 | Remarketing Status1: Text (`{{1.mappable_column_values.color_mm15qwdh.text}}`) | Text: Not equal to | `Messaged` |
| 2 | Remarketing Status1: Text (`{{1.mappable_column_values.color_mm15qwdh.text}}`) | Text: Not equal to | `Ready to Send` |
| 3 | Date: Date (`{{1.mappable_column_values.Date.date}}`) | Numeric: Less than or equal to | `{{addDays(now; -21)}}` |

**Module 6 — Monday.com: Update Column Values of a Specific Item**

| Setting | Value |
|---------|-------|
| Board | Orders |
| Item ID | `{{1.id}}` |
| Remarketing Status | `Messaged` |

**Module — Phone number: Parse a phone number**

| Setting | Value |
|---------|-------|
| Phone number | `{{1.mappable_column_values.Phone.text}}` (Phone: Text from Module 1) |
| Default country | Israel (IL) |

**Module — JONI: Send Message**

| Setting | Value |
|---------|-------|
| JONI's webhook URL | *(same Firebase URL as existing JONI scenario)* |
| Mobile/Group Id | Country calling code + Number (from Phone parser) |
| Text | See message below |
| Message Type | Text |
| Send Chat To Archive | No |

**WhatsApp Message:**
```
היי {name} 😊 One Zone כאן.
עברו כבר כמה שבועות מאז ההזמנה שלך-הכול הגיע בול? 🙌
כאות תודה: קוד הנחה 15% לרכישה הבאה זון15
onezonejersey.com
```
Where `{name}` = Name field from Module 1.

### Scenario Flow

```
[Monday: Search Status=Sent, limit 50]
    │
    ├── Filter "Eligible":
    │     Remarketing Status ≠ "Messaged"
    │     AND Remarketing Status ≠ "Ready to Send"
    │     AND Sent Date ≤ 21 days ago
    │
    ▼
[Monday: Update → Remarketing Status = "Messaged"]
    │
    ▼
[Phone number: Parse (Israel)]
    │
    ▼
[JONI: Send WhatsApp Message]
```

**Schedule:** Daily at 18:00, timezone Asia/Jerusalem

---

## Part D — How JONI Works

JONI uses **Firebase Realtime Database** + a **Chrome extension**:
- Make writes the message to Firebase via JONI's webhook
- JONI Chrome extension picks it up and sends via WhatsApp Web
- **Requirement:** WhatsApp Web and JONI extension must be open in Chrome on your computer

If your computer is off or Chrome is closed, messages will queue and send when you open them.

---

## Part E — Complete Flow Summary

```
YOU set Status = "Working on it" → then "Sent" when you ship
        ↓
MONDAY Automation #1: Sent Date = Today (automatic)
        ↓
    ... 21 days pass ...
        ↓
MAKE scenario (daily 18:00 Israel time):
  1. Finds: Status=Sent + Remarketing≠Messaged + Sent Date ≤ 21 days ago
  2. Sets Remarketing Status = "Messaged"
  3. Parses phone number
  4. Sends WhatsApp via JONI
        ↓
CUSTOMER receives WhatsApp with discount code זון15
```

---

## Part F — Testing (DONE ✅)

- Tested with real order → WhatsApp message sent successfully
- Filter correctly blocks already-messaged items
- Phone parsing works with Israel numbers

---

## Going Live Checklist

- [x] Monday "Sent Date" column created
- [x] Monday Automation #1 active (Status→Sent → Sent Date=Today)
- [x] Make scenario built and tested
- [x] JONI Send Message module configured and working
- [ ] Delete Sleep module from scenario (if still there)
- [ ] Set Make schedule: daily 18:00 Asia/Jerusalem
- [ ] Activate Make scenario (toggle ON)
- [ ] Ensure WhatsApp Web + JONI Chrome extension stay open daily
- [ ] Create discount code "זון15" in Shopify (if not done)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Make finds 0 items | Check: Status = "Sent"? Board ID correct? |
| Filter blocks everything | Check: Sent Date populated? Use Numeric operator for date |
| JONI 405 error | Check: Webhook URL matches the working scenario exactly |
| JONI doesn't send | WhatsApp Web + JONI extension must be open in Chrome |
| Duplicate messages | Remarketing Status should be "Messaged" after send |
| Wrong phone format | Phone parser handles it; ensure phones are in +972 or 05x format |

---

## Quick Reference

| Item | Value |
|------|-------|
| **Discount code** | זון15 (15% off, constant) |
| **Store** | OneZoneJersey.com |
| **Schedule** | Daily 18:00 Israel time |
| **Wait period** | 21 days after shipment |
| **Message language** | Hebrew |
| **Board** | Orders (ID: 2131896795) |
| **JONI** | Firebase + Chrome extension (automatic via Make) |
| **Filter fields** | `color_mm15qwdh.text` (Remarketing), `Date.date` (Sent Date) |
