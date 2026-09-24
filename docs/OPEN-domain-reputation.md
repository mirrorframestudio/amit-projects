# OPEN: mikra.shop מסומן כ"פישינג" אצל 13 ספקי אבטחה (ירושה מהבעלים הקודם)

**נפתח:** 24.9.2026. עמית: "שלחתי את האתר לכמה אנשים והם אומרים שזה מראה
שהגלישה באתר לא בטוחה".

## מה נבדק ונמצא תקין (24.9.2026)

| בדיקה | תוצאה |
|---|---|
| `http://mikra.shop`, `http://www.mikra.shop` | 308 → https |
| תעודות (apex, www, wp) | Let's Encrypt, תקפות עד 28.11.2026, שמות תואמים |
| HSTS | `max-age=63072000` |
| תוכן מעורב (http:// בתוך דפי https) | אין - בית, מוצר, צ׳קאאוט, מדריכים, ברכות, craft |
| Google Safe Browsing | נקי ("No available data") |
| Kaspersky, Dr.Web, Emsisoft, Sucuri, PhishTank, OpenPhish, URLhaus | נקי |

כלומר זו לא בעיית SSL. זה **מוניטין הדומיין**: הבעלים הקודם של mikra.shop
הריץ עליו דפי ספאם (ראו `proxy.ts` - 410 לנתיבי `/collections/`, `/ro-lmny/` וכו׳),
וספקי אנטי-וירוס קטלגו את הדומיין כפישינג. מי שמריץ Bitdefender / ESET /
Sophos / Fortinet (גם ברמת ספק אינטרנט או ארגון) רואה מסך אדום.

## VirusTotal, 24.9.2026 - 13/89 מסומן + 1 חשוד

https://www.virustotal.com/gui/domain/mikra.shop

| ספק | סיווג | איפה מבקשים סיווג מחדש |
|---|---|---|
| Bitdefender | Phishing | https://www.bitdefender.com/consumer/support/answer/29358/ → טופס Bitdefender Labs |
| ESET | Phishing | מייל ל-samples@eset.com, נושא: `False positive - URL: mikra.shop` (KB141) |
| Fortinet (FortiGuard) | Phishing | https://www.fortiguard.com/webfilter → חיפוש הדומיין → "Request re-evaluation" |
| Sophos | Phishing | https://support.sophos.com/support/s/filesubmission → "Submit a URL / reclassify" |
| G DATA | Phishing | https://su.gdatasoftware.com/ |
| Forcepoint ThreatSeeker | Phishing | https://csi.forcepoint.com/ → חיפוש → "Suggest a different category" |
| Webroot (BrightCloud) | Malicious | https://www.brightcloud.com/tools/url-ip-lookup.php → "Submit a change request" |
| alphaMountain.ai | Phishing | https://alphamountain.ai/ → False positive / dispute |
| CRDF | Malicious | https://threatcenter.crdf.fr/false_positive.html |
| VIPRE | Phishing | תמיכת VIPRE → false positive URL |
| Lionic | Phishing | https://www.lionic.com/ → Report false positive |
| CyRadar | Phishing | support@cyradar.com |
| ADMINUSLabs | Malicious | https://www.adminuslabs.net/ → contact |
| Gridinsoft | Suspicious | https://gridinsoft.com/ → online scanner → report false positive |

לבדוק ולנקות גם אצל מי שלא מופיע ב-VT אבל נפוץ בישראל (ארגונים, ספקי
אינטרנט, סינון "כשר"):

- Microsoft SmartScreen (Edge/Windows): https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site-guest → "I think this site is incorrectly flagged"
- Norton Safe Web: https://safeweb.norton.com/ → חיפוש → Dispute
- McAfee/Trellix TrustedSource: https://trustedsource.org/
- Trend Micro Site Safety: https://global.sitesafety.trendmicro.com/
- Check Point URL categorization: https://urlcat.checkpoint.com/
- Palo Alto: https://urlfiltering.paloaltonetworks.com/
- Zscaler: https://sitereview.zscaler.com/
- Cisco Talos: https://talosintelligence.com/reputation_center
- **נטפרי / רימון / אתרוג** - הקהל דתי; אתר חדש מופיע אצלם כ"לא נבדק/חסום" עד
  שמבקשים אישור. נטפרי: מהאפליקציה "בקשת פתיחת אתר". רימון: תמיכה.

## הטקסט לשליחה (אנגלית, אותו נוסח לכולם)

```
Subject: False positive - mikra.shop is classified as phishing

mikra.shop is the online store of MIKRA, an Israeli jewellery brand
(Hebrew, ships in Israel). We acquired the domain in 2026 after it had
expired; the previous registrant's content (spam pages under
/collections/, /ro-lmny/, /de-adl/ and similar) is gone and those paths
now return HTTP 410 Gone. The site launched on 30 Aug 2026, is hosted on
Vercel (Next.js), serves only our catalogue, checkout and policy pages,
and has no downloads, forms collecting credentials, or redirects.

Google Safe Browsing, Kaspersky, Dr.Web, Sucuri and PhishTank all report
it clean. VirusTotal: https://www.virustotal.com/gui/domain/mikra.shop

Please re-evaluate and remove the phishing/malicious classification.
Contact: <המייל של החנות>
```

## סטטוס

- [x] 24.9.2026 - Reanalyze ב-VirusTotal הופעל. תוצאה: עדיין 13/89, קטגוריות
      "phishing and other frauds". סריקה מחדש לא מנקה - רק פנייה ידנית לכל ספק.
- [ ] לבקש צילום מסך מהאנשים שקיבלו את האזהרה - איזה תוכנה/דפדפן. זה קובע
      את הסדר: הספק שהם רואים ראשון.
- [ ] לשלוח את הטקסט ל-14 הספקים בטבלה (כל טופס דורש מייל/קאפצ׳ה - ידני)
- [ ] אחרי שבוע: לבדוק שוב ב-VT ולסמן מי הוריד
- [ ] Search Console → "בעיות אבטחה" (Security issues) - לוודא שריק
