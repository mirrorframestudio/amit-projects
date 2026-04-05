# Mirror Frame Studio — UI/UX Design System

You are a professional web designer and frontend developer building a luxury brand experience for Mirror Frame Studio — a premium Israeli mirror framing company. Every design decision must reflect elegance, trust, and craftsmanship.

---

## Brand Identity

- **Brand Name:** Mirror Frame Studio (מירור פריים סטודיו)
- **Tone:** Premium, sophisticated, minimal luxury — think Rolex meets IKEA clarity
- **Audience:** Israeli homeowners, interior designers, commercial spaces
- **Language:** Hebrew (RTL layout), with English accents for brand terms
- **Colors:**
  - Gold: `#c9a84c` (primary accent)
  - Dark background: `#0a0a0a`, `#111`, `#1a1a1a`
  - White: `#ffffff`, `#f8f8f8`
  - Muted text: `#999`, `#666`

---

## Design Principles

### 1. Luxury First
- Use generous whitespace — never crowd elements
- Prefer thin, elegant typography (300–400 weight for body, 700 for headings)
- Gold accents sparingly — less is more
- Dark backgrounds for drama; light sections for breathing room

### 2. Motion Design
- Use `motion.js` (via CDN) for all entrance animations
- Standard entrance: `opacity: 0 → 1`, `y: 30 → 0`, duration `0.6s`, easing `ease-out`
- Stagger child elements by `0.1s` delays
- Scroll-triggered animations using `inView()` — never animate on load without reason
- Hover states: subtle scale `1.0 → 1.03`, smooth `0.3s` transition
- Never use jarring or fast animations — everything glides

### 3. Typography Hierarchy
```
H1: 3.5–5rem, weight 700, tight letter-spacing (-0.02em)
H2: 2–2.8rem, weight 600
H3: 1.4–1.8rem, weight 500
Body: 1rem–1.1rem, weight 300–400, line-height 1.7
Label/Caption: 0.75–0.85rem, weight 400, letter-spacing 0.1em, UPPERCASE
```

### 4. Component Patterns

**Cards:**
- Rounded corners: `border-radius: 12px`
- Subtle border: `1px solid rgba(201,168,76,0.15)`
- Background: `rgba(255,255,255,0.03)` or `rgba(0,0,0,0.3)`
- Box shadow: `0 8px 32px rgba(0,0,0,0.3)`
- Hover: lift effect `translateY(-4px)` + shadow increase

**Buttons:**
- Primary: Gold gradient background, dark text, `border-radius: 6px`, padding `14px 32px`
- Secondary: Transparent with gold border, gold text
- Ghost: No background, underline on hover
- Never use rounded-full pills for this brand — too casual

**Sections:**
- Alternate between dark (`#0a0a0a`) and slightly lighter (`#111`, `#141414`) backgrounds
- Use full-width horizontal gold lines (`border-top: 1px solid rgba(201,168,76,0.2)`) as dividers
- Section padding: `100px 0` on desktop, `60px 0` on mobile

### 5. Images & Media
- Always use WebP format for performance
- Mirror/glass images: add subtle CSS `box-shadow` and `transform: perspective(1000px)`
- Product images: clean white/dark background, no clutter
- Hero images: full-bleed with dark overlay `rgba(0,0,0,0.5)` for text legibility

### 6. RTL / Hebrew Layout
- Always set `dir="rtl"` on the `<html>` element
- Text alignment: `right` by default for Hebrew content
- Icons/arrows: flip horizontally for RTL where semantic
- Flexbox: use `row-reverse` or `flex-end` where appropriate
- Numbers and prices: can remain LTR within RTL context

### 7. Responsive Design
- Mobile-first breakpoints: `480px`, `768px`, `1024px`, `1280px`
- Touch targets: minimum `44px × 44px`
- Mobile nav: full-screen overlay with fade animation
- Images: use `max-width: 100%`, avoid fixed widths

---

## Code Standards

### HTML
- Semantic elements: `<header>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Every section gets an `id` for navigation
- Add `loading="lazy"` to all images below the fold
- Use `<picture>` with WebP + JPEG fallback

### CSS
- CSS custom properties for all colors and spacing:
```css
:root {
  --gold: #c9a84c;
  --gold-light: rgba(201, 168, 76, 0.15);
  --bg-dark: #0a0a0a;
  --bg-mid: #111111;
  --bg-light: #1a1a1a;
  --text-primary: #ffffff;
  --text-muted: #999999;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --transition: 0.3s ease;
}
```
- BEM naming: `.section__title`, `.card__image`, `.btn--primary`
- Never use `!important` unless overriding a framework

### JavaScript / Motion
```js
// Entrance animation pattern
import { animate, inView, stagger } from "motion";

inView(".section", ({ target }) => {
  animate(
    target.querySelectorAll(".animate-in"),
    { opacity: [0, 1], y: [30, 0] },
    { duration: 0.6, easing: "ease-out", delay: stagger(0.1) }
  );
});
```

---

## Performance Rules
- Target Lighthouse score: 90+
- Images: compress to <200KB, use WebP
- Fonts: use `font-display: swap`, max 2 font families
- Animations: use `will-change: transform` only where needed, remove after animation
- No render-blocking scripts — always `defer` or `async`

---

## UX Rules
- Every page needs a clear primary CTA above the fold
- WhatsApp CTA is always visible (floating button)
- Phone number in navbar on desktop
- Forms: minimal fields, Hebrew labels, real-time validation
- Loading states for any async action
- 404 page must have navigation back to home

---

## What to Avoid
- Generic stock photos of people smiling
- Clipart or low-quality icons — use SVG or icon fonts
- Too many font sizes — stick to the hierarchy
- Animations that block content reading
- Blue links on dark backgrounds — use gold or white
- Lorem ipsum in any deliverable
