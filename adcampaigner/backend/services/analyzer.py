"""
Analyzer — reused from fb-ads-analyzer.
All functions are pure (data in → result out), already multi-tenant ready.
"""
# Import everything from the original analyzer
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any


# ═══════════════════════════════════════════════════════════════
# 1. CAMPAIGN-LEVEL ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_campaigns(campaigns: list[dict]) -> dict:
    if not campaigns:
        return {"campaigns": [], "best": None, "worst": None,
                "total_spend": 0, "total_purchases": 0, "total_impressions": 0,
                "total_clicks": 0, "avg_ctr": 0, "total_roas": 0,
                "total_atc": 0, "total_ic": 0, "total_purchase_value": 0}

    for c in campaigns:
        c["cost_per_result"] = c["spend"] / c["purchases"] if c["purchases"] > 0 else float("inf")
        c["atc_rate"] = (c["add_to_cart"] / c["clicks"] * 100) if c["clicks"] > 0 else 0
        c["ic_rate"] = (c["initiate_checkout"] / c["add_to_cart"] * 100) if c["add_to_cart"] > 0 else 0
        c["purchase_rate"] = (c["purchases"] / c["initiate_checkout"] * 100) if c["initiate_checkout"] > 0 else 0
        c["overall_conv_rate"] = (c["purchases"] / c["clicks"] * 100) if c["clicks"] > 0 else 0

    ranked = sorted(campaigns, key=lambda x: x["cost_per_result"])
    active = [c for c in ranked if c["spend"] > 0]
    total_spend = sum(c["spend"] for c in campaigns)
    total_pv = sum(c["purchase_value"] for c in campaigns)

    return {
        "campaigns": ranked,
        "best": active[0] if active else None,
        "worst": active[-1] if active else None,
        "total_spend": total_spend,
        "total_purchases": sum(c["purchases"] for c in campaigns),
        "total_impressions": sum(c["impressions"] for c in campaigns),
        "total_clicks": sum(c["clicks"] for c in campaigns),
        "avg_ctr": sum(c["ctr"] for c in campaigns) / len(campaigns) if campaigns else 0,
        "total_roas": total_pv / total_spend if total_spend > 0 else 0,
        "total_atc": sum(c["add_to_cart"] for c in campaigns),
        "total_ic": sum(c["initiate_checkout"] for c in campaigns),
        "total_purchase_value": total_pv,
        "avg_frequency": sum(c["frequency"] for c in campaigns) / len(campaigns) if campaigns else 0,
    }


# ═══════════════════════════════════════════════════════════════
# 2. AD-LEVEL ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_ads(ads: list[dict]) -> dict:
    if not ads:
        return {"ads": [], "top5": [], "bottom5": [], "total_ads": 0, "active_ads": 0}

    for a in ads:
        a["cost_per_result"] = a["spend"] / a["purchases"] if a["purchases"] > 0 else float("inf")
        a["conv_rate"] = (a["purchases"] / a["clicks"] * 100) if a["clicks"] > 0 else 0
        a["atc_rate"] = (a["add_to_cart"] / a["clicks"] * 100) if a["clicks"] > 0 else 0
        a["ic_rate"] = (a["initiate_checkout"] / a["add_to_cart"] * 100) if a["add_to_cart"] > 0 else 0
        a["purchase_rate"] = (a["purchases"] / a["initiate_checkout"] * 100) if a["initiate_checkout"] > 0 else 0
        a["cost_per_atc"] = a["spend"] / a["add_to_cart"] if a["add_to_cart"] > 0 else float("inf")

    active = [a for a in ads if a["spend"] > 5]
    ranked = sorted(active, key=lambda x: x["cost_per_result"])

    return {
        "ads": ranked,
        "top5": ranked[:5],
        "bottom5": ranked[-5:] if len(ranked) >= 5 else ranked,
        "total_ads": len(ads),
        "active_ads": len(active),
    }


# ═══════════════════════════════════════════════════════════════
# 3. MULTI-GRANULARITY TREND ANALYSIS
# ═══════════════════════════════════════════════════════════════

def _aggregate_rows(rows: list[dict]) -> dict:
    agg = {
        "spend": sum(r["spend"] for r in rows),
        "impressions": sum(r["impressions"] for r in rows),
        "clicks": sum(r["clicks"] for r in rows),
        "reach": sum(r["reach"] for r in rows),
        "purchases": sum(r["purchases"] for r in rows),
        "add_to_cart": sum(r["add_to_cart"] for r in rows),
        "initiate_checkout": sum(r["initiate_checkout"] for r in rows),
        "purchase_value": sum(r["purchase_value"] for r in rows),
    }
    agg["cpc"] = agg["spend"] / agg["clicks"] if agg["clicks"] > 0 else 0
    agg["ctr"] = (agg["clicks"] / agg["impressions"] * 100) if agg["impressions"] > 0 else 0
    agg["cost_per_purchase"] = agg["spend"] / agg["purchases"] if agg["purchases"] > 0 else 0
    agg["roas"] = agg["purchase_value"] / agg["spend"] if agg["spend"] > 0 else 0
    agg["cost_per_atc"] = agg["spend"] / agg["add_to_cart"] if agg["add_to_cart"] > 0 else 0
    agg["atc_to_purchase"] = (agg["purchases"] / agg["add_to_cart"] * 100) if agg["add_to_cart"] > 0 else 0
    agg["frequency"] = agg["impressions"] / agg["reach"] if agg["reach"] > 0 else 0
    return agg


def analyze_trends(daily_data: list[dict]) -> dict:
    if not daily_data:
        return {"daily": [], "weekly": [], "monthly": [], "overall": {},
                "trend": "no_data", "trend_details": {}}

    by_date: dict[str, list[dict]] = {}
    for row in daily_data:
        d = row["date_start"]
        by_date.setdefault(d, []).append(row)

    daily = []
    for d in sorted(by_date.keys()):
        agg = _aggregate_rows(by_date[d])
        agg["date"] = d
        daily.append(agg)

    by_week: dict[str, list[dict]] = {}
    for row in daily_data:
        dt = datetime.strptime(row["date_start"], "%Y-%m-%d")
        week_start = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
        by_week.setdefault(week_start, []).append(row)

    weekly = []
    for w in sorted(by_week.keys()):
        agg = _aggregate_rows(by_week[w])
        agg["week_start"] = w
        weekly.append(agg)

    by_month: dict[str, list[dict]] = {}
    for row in daily_data:
        month_key = row["date_start"][:7]
        by_month.setdefault(month_key, []).append(row)

    monthly = []
    for m in sorted(by_month.keys()):
        agg = _aggregate_rows(by_month[m])
        agg["month"] = m
        monthly.append(agg)

    overall = _aggregate_rows(daily_data)

    trend = "not_enough_data"
    trend_details = {}
    if len(daily) >= 14:
        recent = daily[-7:]
        previous = daily[-14:-7]
        recent_agg = _aggregate_rows([{"spend": d["spend"], "impressions": d["impressions"],
                                        "clicks": d["clicks"], "reach": d["reach"],
                                        "purchases": d["purchases"], "add_to_cart": d["add_to_cart"],
                                        "initiate_checkout": d["initiate_checkout"],
                                        "purchase_value": d["purchase_value"]} for d in recent])
        prev_agg = _aggregate_rows([{"spend": d["spend"], "impressions": d["impressions"],
                                      "clicks": d["clicks"], "reach": d["reach"],
                                      "purchases": d["purchases"], "add_to_cart": d["add_to_cart"],
                                      "initiate_checkout": d["initiate_checkout"],
                                      "purchase_value": d["purchase_value"]} for d in previous])

        def _pct(new, old):
            return ((new - old) / old * 100) if old > 0 else 0

        trend_details = {
            "spend_change": _pct(recent_agg["spend"], prev_agg["spend"]),
            "purchases_change": _pct(recent_agg["purchases"], prev_agg["purchases"]),
            "roas_change": _pct(recent_agg["roas"], prev_agg["roas"]),
            "atc_change": _pct(recent_agg["add_to_cart"], prev_agg["add_to_cart"]),
            "cpp_change": _pct(recent_agg["cost_per_purchase"], prev_agg["cost_per_purchase"]),
            "frequency_change": _pct(recent_agg["frequency"], prev_agg["frequency"]),
            "recent": recent_agg,
            "previous": prev_agg,
        }

        roas_chg = trend_details["roas_change"]
        trend = "improving" if roas_chg > 5 else ("declining" if roas_chg < -5 else "stable")

    return {
        "daily": daily, "weekly": weekly, "monthly": monthly,
        "overall": overall, "trend": trend, "trend_details": trend_details,
    }


# ═══════════════════════════════════════════════════════════════
# 4-8: Demographics, Placements, Recommendations, Comparison, Fatigue
# ═══════════════════════════════════════════════════════════════

def analyze_demographics(demo_data: list[dict]) -> dict:
    if not demo_data:
        return {"segments": [], "best_age": None, "best_gender": None,
                "by_age": [], "by_gender": []}

    for d in demo_data:
        d["cost_per_result"] = d["spend"] / d["purchases"] if d["purchases"] > 0 else float("inf")

    by_age: dict[str, dict] = {}
    for d in demo_data:
        age = d.get("age", "unknown")
        if age not in by_age:
            by_age[age] = {"age": age, "spend": 0, "purchases": 0, "clicks": 0,
                           "impressions": 0, "add_to_cart": 0, "initiate_checkout": 0, "purchase_value": 0}
        for k in ["spend", "purchases", "clicks", "impressions", "add_to_cart", "initiate_checkout", "purchase_value"]:
            by_age[age][k] += d[k]

    for v in by_age.values():
        v["cost_per_purchase"] = v["spend"] / v["purchases"] if v["purchases"] > 0 else float("inf")
        v["ctr"] = (v["clicks"] / v["impressions"] * 100) if v["impressions"] > 0 else 0
        v["roas"] = v["purchase_value"] / v["spend"] if v["spend"] > 0 else 0

    ages_ranked = sorted(by_age.values(), key=lambda x: x["cost_per_purchase"])
    best_age = ages_ranked[0] if ages_ranked and ages_ranked[0]["purchases"] > 0 else None

    by_gender: dict[str, dict] = {}
    for d in demo_data:
        g = d.get("gender", "unknown")
        if g not in by_gender:
            by_gender[g] = {"gender": g, "spend": 0, "purchases": 0, "clicks": 0,
                            "impressions": 0, "add_to_cart": 0, "initiate_checkout": 0, "purchase_value": 0}
        for k in ["spend", "purchases", "clicks", "impressions", "add_to_cart", "initiate_checkout", "purchase_value"]:
            by_gender[g][k] += d[k]

    for v in by_gender.values():
        v["cost_per_purchase"] = v["spend"] / v["purchases"] if v["purchases"] > 0 else float("inf")
        v["roas"] = v["purchase_value"] / v["spend"] if v["spend"] > 0 else 0

    genders_ranked = sorted(by_gender.values(), key=lambda x: x["cost_per_purchase"])
    best_gender = genders_ranked[0] if genders_ranked and genders_ranked[0]["purchases"] > 0 else None

    return {
        "segments": demo_data, "by_age": ages_ranked, "by_gender": genders_ranked,
        "best_age": best_age, "best_gender": best_gender,
    }


def analyze_placements(placement_data: list[dict]) -> dict:
    if not placement_data:
        return {"placements": []}
    for p in placement_data:
        p["cost_per_result"] = p["spend"] / p["purchases"] if p["purchases"] > 0 else float("inf")
        p["ctr"] = (p["clicks"] / p["impressions"] * 100) if p["impressions"] > 0 else 0
        p["roas"] = p["purchase_value"] / p["spend"] if p["spend"] > 0 else 0
    return {"placements": sorted(placement_data, key=lambda x: x["cost_per_result"])}


def generate_recommendations(campaign_analysis: dict, ad_analysis: dict,
                              demo_analysis: dict, trend_analysis: dict,
                              adset_data: list[dict] | None = None,
                              fatigue_data: list[dict] | None = None) -> list[dict]:
    recs: list[dict] = []

    trend = trend_analysis.get("trend", "")
    td = trend_analysis.get("trend_details", {})

    if trend == "declining":
        details = []
        if td.get("roas_change", 0) < -10:
            details.append(f"ROAS ירד ב-{abs(td['roas_change']):.0f}%")
        if td.get("purchases_change", 0) < -10:
            details.append(f"רכישות ירדו ב-{abs(td['purchases_change']):.0f}%")
        detail_str = " | ".join(details) if details else "ביצועים בירידה"
        recs.append({"campaign": "כללי", "adset": "", "ad": "", "type": "creative", "icon": "📉",
                      "text": f"ביצועים בירידה ב-7 ימים אחרונים — {detail_str}. כדאי לרענן קריאייטיב", "priority": 1})
    elif trend == "improving":
        recs.append({"campaign": "כללי", "adset": "", "ad": "", "type": "scale", "icon": "📈",
                      "text": "ביצועים בעלייה — להמשיך עם האסטרטגיה הנוכחית ולשקול הגדלת תקציב", "priority": 4})

    best = campaign_analysis.get("best")
    worst = campaign_analysis.get("worst")
    if best and worst and best is not worst:
        if best["cost_per_result"] < worst["cost_per_result"] * 0.5 and worst["cost_per_result"] != float("inf"):
            recs.append({"campaign": worst.get("campaign_name", ""), "adset": "", "ad": "",
                          "type": "budget", "icon": "💡",
                          "text": f"להעביר תקציב מקמפיין זה (₪{worst['cost_per_result']:,.0f}/רכישה) לקמפיין \"{best.get('campaign_name', '')}\" (₪{best['cost_per_result']:,.0f}/רכישה)",
                          "priority": 2})

    for ad in ad_analysis.get("ads", []):
        spend = ad["spend"]
        if spend > 50 and ad["purchases"] == 0 and ad["add_to_cart"] == 0:
            recs.append({"campaign": ad.get("campaign_name", ""), "adset": ad.get("adset_name", ""),
                          "ad": ad.get("ad_name", ""), "type": "kill", "icon": "🔴",
                          "text": f"לכבות — ₪{spend:,.0f} הוצאה, 0 הוספות לעגלה, 0 רכישות", "priority": 1})
        elif ad["purchases"] >= 2 and ad.get("roas", 0) > 2:
            recs.append({"campaign": ad.get("campaign_name", ""), "adset": ad.get("adset_name", ""),
                          "ad": ad.get("ad_name", ""), "type": "scale", "icon": "🟢",
                          "text": f"להגדיל תקציב — ROAS {ad['roas']:.2f}, {ad['purchases']} רכישות", "priority": 3})

    if fatigue_data:
        for f in fatigue_data:
            sev_icon = {"critical": "🔥", "warning": "😴", "watch": "👀"}.get(f["severity"], "")
            priority = {"critical": 1, "warning": 2, "watch": 3}.get(f["severity"], 3)
            recs.append({"campaign": f.get("campaign_name", ""), "adset": f.get("adset_name", ""),
                          "ad": f.get("ad_name", ""), "type": "fatigue", "icon": sev_icon,
                          "text": f"{f['recommendation']} — CTR ירד {abs(f['ctr_change_pct']):.0f}%", "priority": priority})

    if demo_analysis.get("best_age"):
        age = demo_analysis["best_age"]
        recs.append({"campaign": "כללי", "adset": "", "ad": "", "type": "audience", "icon": "👥",
                      "text": f"קהל יעד הכי טוב: גיל {age['age']} — ₪{age['cost_per_purchase']:,.0f}/רכישה, ROAS {age.get('roas', 0):.2f}",
                      "priority": 4})

    recs.sort(key=lambda r: r["priority"])
    if not recs:
        recs.append({"campaign": "כללי", "adset": "", "ad": "", "type": "info", "icon": "✅",
                      "text": "הביצועים יציבים, אין המלצות חריגות כרגע", "priority": 5})
    return recs


def recommendations_to_strings(recs: list[dict]) -> list[str]:
    lines = []
    for r in recs:
        parts = []
        if r["campaign"] and r["campaign"] != "כללי":
            parts.append(r["campaign"])
        if r["adset"]:
            parts.append(r["adset"])
        if r["ad"]:
            parts.append(r["ad"])
        prefix = " → ".join(parts)
        if prefix:
            lines.append(f"{r['icon']} [{prefix}] {r['text']}")
        else:
            lines.append(f"{r['icon']} {r['text']}")
    return lines


def _pct_change(new: float, old: float) -> float:
    return ((new - old) / old * 100) if old > 0 else 0


COMPARISON_METRICS = [
    ("spend", "הוצאה", "money"), ("purchase_value", "הכנסות", "money"),
    ("roas", "ROAS", "decimal"), ("purchases", "רכישות", "int"),
    ("add_to_cart", "הוספה לעגלה", "int"), ("initiate_checkout", "התחלת תשלום", "int"),
    ("frequency", "תדירות", "decimal"), ("ctr", "CTR%", "pct"),
    ("cost_per_purchase", "עלות/רכישה", "money"),
]
_LOWER_IS_BETTER = {"spend", "cost_per_purchase", "frequency"}


def analyze_period_comparison(trend_analysis: dict) -> dict:
    result = {"week": None, "month": None}
    weekly = trend_analysis.get("weekly", [])
    if len(weekly) >= 2:
        cur, prev = weekly[-1], weekly[-2]
        result["week"] = {
            "current_label": cur.get("week_start", ""), "previous_label": prev.get("week_start", ""),
            "current": cur, "previous": prev,
            "changes": _compare_two_periods(cur, prev),
        }
    monthly = trend_analysis.get("monthly", [])
    if len(monthly) >= 2:
        cur, prev = monthly[-1], monthly[-2]
        result["month"] = {
            "current_label": cur.get("month", ""), "previous_label": prev.get("month", ""),
            "current": cur, "previous": prev,
            "changes": _compare_two_periods(cur, prev),
        }
    return result


def _compare_two_periods(current: dict, previous: dict) -> list[dict]:
    changes = []
    for key, label, fmt in COMPARISON_METRICS:
        cur_val = current.get(key, 0)
        prev_val = previous.get(key, 0)
        pct = _pct_change(cur_val, prev_val)
        if key in _LOWER_IS_BETTER:
            direction = "better" if pct < -3 else ("worse" if pct > 3 else "same")
        else:
            direction = "better" if pct > 3 else ("worse" if pct < -3 else "same")
        changes.append({"key": key, "label": label, "format": fmt,
                        "current": cur_val, "previous": prev_val,
                        "pct_change": pct, "direction": direction})
    return changes


def detect_creative_fatigue(daily_data: list[dict], min_days: int = 5, min_spend: float = 20) -> list[dict]:
    if not daily_data:
        return []
    by_ad: dict[str, list[dict]] = {}
    for row in daily_data:
        ad_id = row.get("ad_id", "")
        if ad_id:
            by_ad.setdefault(ad_id, []).append(row)

    fatigued = []
    for ad_id, rows in by_ad.items():
        rows.sort(key=lambda r: r["date_start"])
        if len(rows) < min_days:
            continue
        total_spend = sum(r["spend"] for r in rows)
        if total_spend < min_spend:
            continue

        mid = len(rows) // 2
        first_half, second_half = rows[:mid], rows[mid:]

        def _wctr(data):
            ti = sum(r["impressions"] for r in data)
            tc = sum(r["clicks"] for r in data)
            return (tc / ti * 100) if ti > 0 else 0

        def _wfreq(data):
            ti = sum(r["impressions"] for r in data)
            tr = sum(r["reach"] for r in data)
            return ti / tr if tr > 0 else 0

        ctr_first, ctr_second = _wctr(first_half), _wctr(second_half)
        freq_first, freq_second = _wfreq(first_half), _wfreq(second_half)
        ctr_change = _pct_change(ctr_second, ctr_first) if ctr_first > 0 else 0
        freq_change = _pct_change(freq_second, freq_first) if freq_first > 0 else 0

        severity = None
        if ctr_change < -40 and freq_second > 4:
            severity = "critical"
        elif ctr_change < -20 and freq_second > 3:
            severity = "warning"
        elif ctr_change < -15 and freq_change > 20:
            severity = "watch"

        if severity is None:
            continue

        rec_text = {"critical": "המודעה שחוקה — להחליף קריאייטיב מיד",
                    "warning": "סימני שחיקה — להכין קריאייטיב חלופי",
                    "watch": "מגמת שחיקה מתחילה — לעקוב"}

        fatigued.append({
            "ad_id": ad_id, "ad_name": rows[0].get("ad_name", ""),
            "campaign_name": rows[0].get("campaign_name", ""),
            "adset_name": rows[0].get("adset_name", ""),
            "severity": severity,
            "ctr_first": ctr_first, "ctr_second": ctr_second,
            "ctr_change_pct": ctr_change,
            "freq_first": freq_first, "freq_second": freq_second,
            "freq_change_pct": freq_change,
            "days_running": len(rows), "total_spend": total_spend,
            "recommendation": rec_text[severity],
        })

    fatigued.sort(key=lambda f: {"critical": 0, "warning": 1, "watch": 2}.get(f["severity"], 9))
    return fatigued
