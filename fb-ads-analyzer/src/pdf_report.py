"""
Daily PDF report — Hebrew RTL, clean professional layout.
Uses Arial (Windows) which contains full Hebrew glyph set.
ReportLab renders text LTR, so we use python-bidi get_display()
to convert Hebrew logical order → visual order before rendering.
"""

import logging
import re
from datetime import date
from pathlib import Path
from typing import Any

from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)

# ── Fonts ──────────────────────────────────────────────────
_FONTS_OK = False

def _reg():
    global _FONTS_OK
    if _FONTS_OK:
        return
    win = Path("C:/Windows/Fonts")
    for name, f in [("H", "arial.ttf"), ("HB", "arialbd.ttf")]:
        p = win / f
        if p.exists():
            pdfmetrics.registerFont(TTFont(name, str(p)))
    _FONTS_OK = True


# ── Hebrew bidi helper ─────────────────────────────────────
def _h(text: str) -> str:
    """
    Convert Hebrew text (logical Unicode order) → visual order for ReportLab.
    Preserves HTML markup tags so Paragraph() still works.
    """
    if not text:
        return text
    # Split on HTML tags, apply bidi only to text segments
    parts = re.split(r'(<[^>]*>)', text)
    out = []
    for part in parts:
        if part.startswith('<'):
            out.append(part)          # keep tags intact
        elif part:
            out.append(get_display(part, base_dir='R'))
    return ''.join(out)


# ── Palette ────────────────────────────────────────────────
NAVY    = colors.HexColor("#0f172a")
BLUE    = colors.HexColor("#3b82f6")
BLUE_LT = colors.HexColor("#eff6ff")
GREEN   = colors.HexColor("#22c55e")
RED     = colors.HexColor("#ef4444")
ORANGE  = colors.HexColor("#f97316")
PURPLE  = colors.HexColor("#8b5cf6")
GREY    = colors.HexColor("#94a3b8")
GREY_LT = colors.HexColor("#f8fafc")
BORDER  = colors.HexColor("#e2e8f0")
TEXT    = colors.HexColor("#1e293b")
WHITE   = colors.white

W, H   = A4
MARGIN = 16 * mm
COL    = W - 2 * MARGIN

# RTL = RIGHT-aligned, LTR = LEFT-aligned
RTL = 2
LTR = 0
CTR = 1


# ── Style helper ───────────────────────────────────────────
def S(name, font="H", size=9, color=TEXT, align=RTL, leading=None, **kw):
    return ParagraphStyle(
        name, fontName=font, fontSize=size, textColor=color,
        leading=leading or round(size * 1.45),
        alignment=align, **kw,
    )


def P(text, style):
    return Paragraph(text, style)


# ── Delta ──────────────────────────────────────────────────
def _d(cur: float, prev: float) -> str:
    if not prev or abs((cur - prev) / prev) < 0.01:
        return ""
    pct = (cur - prev) / prev * 100
    return (f' <font color="#22c55e">▲{pct:.0f}%</font>' if pct > 0
            else f' <font color="#ef4444">▼{abs(pct):.0f}%</font>')


# ── Section header ─────────────────────────────────────────
def section(icon: str, title: str) -> list:
    return [
        Spacer(1, 5 * mm),
        Table(
            [[P(f"{_h(title)}  {icon}", S("sh", font="HB", size=10, color=WHITE, align=RTL))]],
            colWidths=[COL], rowHeights=8 * mm,
            style=TableStyle([
                ("BACKGROUND",  (0, 0), (-1, -1), BLUE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING",(0, 0), (-1, -1), 10),
                ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
            ]),
        ),
        Spacer(1, 2 * mm),
    ]


# ── Metric cards ───────────────────────────────────────────
def metric_row(pairs: list[tuple]) -> Table:
    """pairs = [(label, value, badge), ...]  up to 3."""
    n   = len(pairs)
    cw  = COL / n
    row = []
    for label, value, badge in pairs:
        cell = Table(
            [
                [P(_h(label), S(f"ml{label}", size=8, color=GREY, align=CTR))],
                [P(f"<b>{value}</b>{badge}",
                   S(f"mv{label}", font="HB", size=13, align=CTR))],
            ],
            colWidths=[cw - 6],
            rowHeights=[6 * mm, 9 * mm],
            style=TableStyle([
                ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
                ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING",   (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 2),
            ]),
        )
        row.append(cell)

    t = Table([row], colWidths=[cw] * n, rowHeights=17 * mm)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREY_LT),
        ("BOX",           (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 3),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 3),
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


# ── Funnel row ─────────────────────────────────────────────
def funnel_row(atc: int, ic: int, orders: int) -> Table:
    a2i = f"{round(ic/atc*100)}%" if atc else "—"
    i2p = f"{round(orders/ic*100)}%" if ic else "—"

    def num(v, sn): return P(f"<b>{v}</b>", S(sn, font="HB", size=13, align=CTR))
    def pct(v, sn): return P(f'<font color="#94a3b8" size="8">{v}</font>',
                              S(sn, size=8, align=CTR))
    def lbl(v, sn): return P(_h(v), S(sn, size=8, color=GREY, align=CTR))

    data = [
        [lbl("רכישה", "fl3"), pct(i2p, "fp2"), lbl("IC", "fl2"),
         pct(a2i, "fp1"), lbl("ATC", "fl1")],
        [num(orders, "fv3"), P("←", S("fa2", size=9, color=GREY, align=CTR)),
         num(ic, "fv2"),     P("←", S("fa1", size=9, color=GREY, align=CTR)),
         num(atc, "fv1")],
    ]
    cw = [COL*0.28, COL*0.1, COL*0.15, COL*0.1, COL*0.15]
    # pad remaining width
    cw += [COL - sum(cw)]

    data[0].append(P("", S("fe", size=8)))
    data[1].append(P("", S("fe2", size=8)))

    t = Table(data, colWidths=cw, rowHeights=[6 * mm, 9 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_LT),
        ("BOX",        (0, 0), (-1, -1), 0.5, BORDER),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",(0, 0), (-1, -1), 4),
    ]))
    return t


# ── Hourly table ───────────────────────────────────────────
def hourly_table(hourly_data: list[dict]) -> Table | None:
    top = sorted(
        [h for h in hourly_data if h["add_to_cart"] + h["purchases"] > 0],
        key=lambda h: h["add_to_cart"] + h["purchases"] * 3,
        reverse=True,
    )[:5]
    if not top:
        return None

    hs = S("hh", font="HB", size=8, color=WHITE, align=CTR)
    header = [
        P(_h("שעה"), hs),
        P(_h("הוספות לעגלה"), hs),
        P(_h("רכישות"), hs),
    ]
    rows = [header]
    for h in top:
        rows.append([
            P(f"{h['hour']:02d}:00–{h['hour']+1:02d}:00",
              S(f"hc{h['hour']}", size=9, align=CTR)),
            P(str(h["add_to_cart"]),
              S(f"ha{h['hour']}", font="HB", size=10, align=CTR)),
            P(str(h["purchases"]),
              S(f"hp{h['hour']}", font="HB", size=10,
                color=GREEN if h["purchases"] else TEXT, align=CTR)),
        ])

    cw = [COL * 0.38, COL * 0.38, COL * 0.24]
    t = Table(rows, colWidths=cw, rowHeights=8 * mm)
    t.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLUE_LT, WHITE]),
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("BOX",            (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID",      (0, 0), (-1, -1), 0.3, BORDER),
        ("LEFTPADDING",    (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 5),
    ]))
    return t


# ── Video table ────────────────────────────────────────────
def video_table(video_data: list[dict]) -> Table | None:
    top = sorted(
        [v for v in video_data if v["plays"] > 50],
        key=lambda v: v["p50_pct"], reverse=True,
    )[:4]
    if not top:
        return None

    def pct_p(pct, sn):
        c = ("#22c55e" if pct >= 50 else "#f97316" if pct >= 25 else "#ef4444")
        return P(f'<b><font color="{c}">{pct}%</font></b>',
                 S(sn, size=9, align=CTR))

    vs = S("vh", font="HB", size=8, color=WHITE, align=CTR)
    header = [P(_h("מודעה"), vs), P(_h("צפיות"), vs),
              P("25%", vs), P("50%", vs), P("75%", vs), P("100%", vs), P(_h("זמן ממוצע"), vs)]
    rows = [header]
    for i, v in enumerate(top):
        name = (v["ad_name"][:26] + "…") if len(v["ad_name"]) > 26 else v["ad_name"]
        avg  = f'{v["avg_watch_sec"]}s' if v["avg_watch_sec"] else "—"
        rows.append([
            P(_h(name), S(f"vn{i}", size=7, align=RTL)),
            P(f'{v["plays"]:,}', S(f"vp{i}", size=8, align=CTR)),
            pct_p(v["p25_pct"],  f"v25{i}"),
            pct_p(v["p50_pct"],  f"v50{i}"),
            pct_p(v["p75_pct"],  f"v75{i}"),
            pct_p(v["p100_pct"], f"v100{i}"),
            P(avg,   S(f"va{i}",  size=8, align=CTR)),
        ])

    cw = [COL*0.27, COL*0.1, COL*0.09, COL*0.09, COL*0.09, COL*0.1, COL*0.16]
    t = Table(rows, colWidths=cw, rowHeights=8 * mm)
    t.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0), PURPLE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [GREY_LT, WHITE]),
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("ALIGN",          (0, 1), (0, -1), "RIGHT"),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("BOX",            (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID",      (0, 0), (-1, -1), 0.3, BORDER),
        ("LEFTPADDING",    (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 5),
    ]))
    return t


# ── Actions table ──────────────────────────────────────────
def actions_table(actions: list[str]) -> Table:
    icon_colors = {
        "🔴": RED, "🟢": GREEN, "🟡": ORANGE,
        "📉": ORANGE, "🔄": GREY, "🔥": RED,
        "😴": GREY, "👀": ORANGE, "💡": BLUE,
    }
    rows, bar_colors = [], []
    for i, a in enumerate(actions):
        clean = a.replace("*", "")
        bar = BLUE
        for icon, c in icon_colors.items():
            if clean.startswith(icon):
                bar = c
                break
        bar_colors.append(bar)
        rows.append([P(_h(clean), S(f"ac{i}", size=9, leading=14, align=RTL))])

    t = Table(rows, colWidths=[COL])
    cmds = [
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GREY_LT, WHITE]),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",    (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 10),
        ("TOPPADDING",     (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 6),
        ("BOX",            (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID",      (0, 0), (-1, -1), 0.3, BORDER),
    ]
    for i, c in enumerate(bar_colors):
        cmds.append(("LINEAFTER", (0, i), (0, i), 4, c))
    t.setStyle(TableStyle(cmds))
    return t


# ── Main ───────────────────────────────────────────────────
def generate_daily_pdf(
    report_date: date,
    meta: dict[str, Any],
    meta_lw: dict[str, Any],
    woo: dict[str, Any],
    woo_lw: dict[str, Any],
    funnel: dict[str, Any],
    hourly_data: list[dict],
    video_data: list[dict],
    actions: list[str],
    drive_link: str | None = None,
    output_dir: Path | None = None,
) -> Path:
    _reg()

    out = output_dir or Path(__file__).resolve().parent.parent / "reports"
    out.mkdir(exist_ok=True)
    pdf_path = out / f"daily_{report_date.isoformat()}.pdf"

    doc = SimpleDocTemplate(
        str(pdf_path), pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=10 * mm, bottomMargin=12 * mm,
        title=f"OneZone Jersey — {report_date.strftime('%d/%m/%Y')}",
    )

    roas    = woo["revenue"] / meta["spend"] if meta["spend"] else 0
    lw_roas = woo_lw["revenue"] / meta_lw["spend"] if meta_lw.get("spend") else 0
    day_heb = {0:"שני",1:"שלישי",2:"רביעי",3:"חמישי",4:"שישי",5:"שבת",6:"ראשון"}
    day     = _h(day_heb.get(report_date.weekday(), ""))
    ds      = report_date.strftime("%d/%m/%Y")

    story = []

    # ── Header ──────────────────────────────────────────────
    hdr = Table([[
        P(f'<font color="#64748b" size="8">{ds}  |  {day}</font>',
          S("hl", size=8, color=GREY, align=LTR)),
        P(f'<b><font color="#3b82f6" size="11">ROAS {roas:.2f}x</font></b>'
          f'  <font color="#64748b" size="8">| {_h("הוצאה")} ₪{meta["spend"]:,.0f}</font>',
          S("hm", size=9, align=CTR)),
        P('<b><font color="white" size="14">OneZone Jersey</font></b>',
          S("hr", font="HB", size=14, color=WHITE, align=RTL)),
    ]], colWidths=[COL*0.28, COL*0.37, COL*0.35], rowHeights=14*mm)
    hdr.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), NAVY),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
    ]))
    story.append(hdr)

    # ── Meta Ads ────────────────────────────────────────────
    story += section("📊", "Meta Ads")
    story.append(metric_row([
        ("הוצאה",  f'₪{meta["spend"]:,.0f}',  _d(meta["spend"],  meta_lw.get("spend", 0))),
        ("חשיפות", f'{meta["impressions"]:,}', ""),
        ("CTR",    f'{meta["ctr"]:.2f}%',      ""),
    ]))
    story.append(Spacer(1, 2*mm))
    story.append(metric_row([
        ("CPC", f'₪{meta["cpc"]:.2f}', ""),
        ("ATC", str(meta["atc"]),       ""),
        ("IC",  str(meta["ic"]),        ""),
    ]))

    # ── Funnel ──────────────────────────────────────────────
    if meta["atc"] > 0:
        story += section("🔽", "פאנל המרה")
        story.append(funnel_row(meta["atc"], meta["ic"], woo["orders"]))

    # ── Site ────────────────────────────────────────────────
    story += section("🛍", "אתר — WooCommerce")
    story.append(metric_row([
        ("מבקרים", f'{woo["visitors"]:,}',   ""),
        ("הזמנות",  str(woo["orders"]),
         _d(woo["orders"],   woo_lw.get("orders", 0))),
        ("המרה",    f'{woo["cvr"]:.2f}%',    ""),
    ]))
    story.append(Spacer(1, 2*mm))
    story.append(metric_row([
        ("הכנסות", f'₪{woo["revenue"]:,.0f}',
         _d(woo["revenue"],  woo_lw.get("revenue", 0))),
        ("ROAS",   f'{roas:.2f}x',
         _d(roas, lw_roas)),
        ("", "", ""),
    ]))

    # ── Hourly ──────────────────────────────────────────────
    if hourly_data:
        ht = hourly_table(hourly_data)
        if ht:
            story += section("🕐", "שעות שיא")
            story.append(ht)

    # ── Video ───────────────────────────────────────────────
    if video_data:
        vt = video_table(video_data)
        if vt:
            story += section("📹", "ביצועי וידאו")
            story.append(P(
                _h("אחוזי צפייה לפי נקודת עצירה — ירוק ≥50%  כתום ≥25%  אדום <25%"),
                S("vc", size=7, color=GREY, align=RTL),
            ))
            story.append(Spacer(1, 2*mm))
            story.append(vt)

    # ── Actions ─────────────────────────────────────────────
    if actions:
        story += section("🎯", "פעולות להיום")
        story.append(actions_table(actions))

    # ── Footer ──────────────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 2*mm))
    footer = _h(f"נוצר אוטומטית  |  {ds}")
    if drive_link:
        footer += f"  |  {_h('דוח Excel')}: {drive_link}"
    story.append(P(footer, S("ft", size=7, color=GREY, align=RTL)))

    doc.build(story)
    logger.info("PDF saved: %s", pdf_path)
    return pdf_path
