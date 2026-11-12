# Responsive workflow — old hack → modern solution

Neutral companion to SKILL.md doctrine 8 (mobile-first in mind,
desktop-first development order). No rant in here, just working CSS.
Format borrowed from modern.css: every old CSS hack next to the modern
CSS that replaces it.

**The principle:** develop on the wide canvas, keep 360px in your head
while you do. Dev order is not cascade direction. Prefer intrinsic
layout; add breakpoints only where the layout must *change*, not merely
shrink. The collapse pass is part of done. Test on a real device.

## 1. The 12-column grid framework → auto-fit/minmax

```html
<!-- old: ~60 KB of framework for a card grid -->
<div class="row">
  <div class="col-12 col-md-6 col-lg-4">…
```

```css
/* new */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
  gap: 1rem;
}
```

Collapses 4 → 2 → 1 columns by itself, zero breakpoints. The `min()`
wrapper stops the `minmax()` floor overflowing narrow containers.
Baseline since 2017 (grid).
When the old way is still fine: never for this pattern — but when a
design needs deliberate control over which items span what, write
`grid-template-areas` at that breakpoint on purpose, not a framework.

## 2. px font sizes with breakpoint ladders → clamp()

```css
/* old */
h1 { font-size: 24px; }
@media (min-width: 768px)  { h1 { font-size: 32px; } }
@media (min-width: 1200px) { h1 { font-size: 48px; } }
```

```css
/* new */
h1 { font-size: clamp(1.5rem, 1rem + 2vw, 3rem); }
```

Smooth scaling between the bounds, no jumps. rem, never px — doctrine 4.
Baseline since 2020.
When the old way is still fine: a brand spec that genuinely mandates
stepped sizes. Rare, and even then keep the units rem.

## 3. Float page layout → grid/flex

```css
/* old */
.sidebar { float: left; width: 30%; }
.content { float: right; width: 68%; }
.clearfix::after { content: ""; display: table; clear: both; }
```

```css
/* new */
.page {
  display: grid;
  grid-template-columns: minmax(12rem, 30%) 1fr;
  gap: 1rem;
}
```

Baseline since 2017.
When the old way is still fine: wrapping text around an image — that is
what `float` was designed FOR. Using it for page layout was the hack.

## 4. max-width undo CSS → redeclare, don't undo

```css
/* old: desktop base, then neutralizing it */
.card { float: left; width: 33%; margin-right: 2%; }
@media (max-width: 768px) {
  .card { float: none; width: auto; margin-right: 0; }
}
```

```css
/* new: desktop-first dev order, but each breakpoint redeclares the layout */
.cards { display: grid; gap: 1rem; grid-template-columns: repeat(4, 1fr); }
@media (max-width: 60em) { .cards { grid-template-columns: 1fr 1fr; } }
@media (max-width: 36em) { .cards { grid-template-columns: 1fr; } }
```

This is desktop-first development done right: reducing grid columns is
one redeclaration per breakpoint. You write a new, simpler layout — you
never un-write the old one. If your reduction pass is full of `none`,
`auto` and `0` resetting your own base rules, your base was the hack.
(With pair 1, even these three lines vanish.)
When the old way is still fine: a legacy component you cannot touch,
and print styles.

## 5. Viewport breakpoints for components → container queries

```css
/* old: lies the moment .card lands in a narrow sidebar */
@media (min-width: 1024px) {
  .card { display: flex; }
}
```

```css
/* new */
.card-host { container-type: inline-size; }
@container (min-width: 30em) {
  .card { display: flex; gap: 1rem; }
}
```

The component responds to where it IS, not to the viewport. Baseline
since 2023 (all engines). Fallback: make the small rendering the
default and let the `@container` enhance — progressive enhancement, no
polyfill.
When the old way is still fine: the page shell (header, nav, footer)
genuinely is viewport-wide. Container queries for components, viewport
queries for the shell.

## 6. 100vh on mobile → svh/dvh + safe-area

```css
/* old: mobile browser chrome overlaps it or it jumps while scrolling */
.hero { height: 100vh; }
```

```css
/* new */
.hero { min-height: 100svh; }  /* stable: no jump when chrome hides */
.hero-alt { min-height: 100dvh; }  /* tracks chrome, use when it must fill */
body { padding-bottom: env(safe-area-inset-bottom); }  /* notched phones */
```

`dvh`/`svh`/`lvh` Baseline since 2022; `env()` safe-area older.
When the old way is still fine: desktop-only internal tools — and even
then `svh` costs nothing.

## 7. JavaScript theme toggles → light-dark() + color-scheme

```css
/* old: duplicated variables plus a JS class toggle, localStorage and an
   inline pre-paint script to dodge the flash of wrong theme */
body { --bg: #fff; --text: #111; }
body.dark { --bg: #111; --text: #eee; }
```

```css
/* new: follows the OS, zero JS */
:root {
  color-scheme: light dark;
  --text: light-dark(#1a1a1a, #e8e8e8);
  --bg: light-dark(#ffffff, #1a1a1a);
}
body { color: var(--text); background: var(--bg); }

/* optional manual override: three lines, one data attribute, one line of JS */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }
```

`light-dark()` resolves against the element's computed `color-scheme`, so
the two override lines make even a manual toggle JS-free apart from setting
the attribute — no variable duplication, no flash. Bonus: `color-scheme`
also switches built-in form controls and scrollbars to dark rendering.
Gotcha: without `color-scheme: light dark` on the element or an ancestor,
`light-dark()` always returns the light value.
`light-dark()` Baseline since 2024; `prefers-color-scheme` since 2020.
When the old way is still fine: pre-2024 browsers — the fallback is a plain
`@media (prefers-color-scheme: dark)` block, not a JS library.

## 8. Unconditional motion and colour-only meaning → user-preference queries

```css
/* old: every user gets the animation, whatever their system says */
.hero { animation: slide-in 1.2s ease-out; }
html { scroll-behavior: smooth; }
```

```css
/* new: motion is opt-in */
@media (prefers-reduced-motion: no-preference) {
  .hero { animation: slide-in 1.2s ease-out; }
  html { scroll-behavior: smooth; }
}
```

Large motion and smooth scrolling can trigger vestibular symptoms; the OS
setting exists so you do not have to guess. Putting motion INSIDE
`no-preference` is progressive enhancement: no query support, no motion
(WCAG 2.3.3 Animation from Interactions, AAA).

```css
/* old: the badge IS its background colour */
.badge { background: var(--accent); }
```

```css
/* new: forced-colors mode (Windows High Contrast) strips background
   colours, so give the shape a real edge in system colours */
@media (forced-colors: active) {
  .badge { border: 1px solid CanvasText; }
}
```

Anything drawn only with `background` (badges, custom checkboxes, icon
buttons) can vanish in forced-colors mode. Use system colours
(`CanvasText`, `ButtonText`, `Highlight`); treat `forced-color-adjust:
none` as a last resort.
`prefers-reduced-motion` Baseline since 2020; `forced-colors` since 2022.
When the old way is still fine: tiny opacity or colour transitions are
generally safe, but the guard costs three lines.

## 9. outline: none → :focus-visible

```css
/* old: kills the focus indicator for every keyboard user */
a:focus, button:focus, input:focus { outline: none; }
```

```css
/* new */
:focus-visible {
  outline: 0.2rem solid currentColor;
  outline-offset: 0.15rem;
}
```

The reason people removed the ring, ugly rectangles after mouse clicks,
is gone: browsers show `:focus-visible` for keyboard focus (and always for
text inputs), not for a mouse click on a button. The indicator must stay
visible (WCAG 2.4.7) and be at least 3:1 against adjacent colours
(WCAG 1.4.11). Use `outline`, not a bare `box-shadow`: shadows are not
rendered in forced-colors mode (pair 8), outlines are.
Baseline since 2022.
When the old way is still fine: never remove the ring without a
replacement. For pre-2022 browsers keep a plain `:focus` rule and cancel it
with `:focus:not(:focus-visible) { outline: none; }`.

## 10. !important and selector arms races → @layer + :where()

```css
/* old: win by shouting */
.nav a { color: #333; }
.nav .menu li a.active.primary { color: white !important; }
```

```css
/* new: later layer wins, whatever the specificity */
@layer reset, base, components, utilities;

@layer base       { :where(a) { color: #333; } }
@layer components { .nav a { text-decoration: none; } }
@layer utilities  { .dark { color: white; } .image-bg { background-size: cover; } }
```

Layer order beats specificity, and `:where()` contributes zero. Single-
purpose modifiers (`.dark`, `.image-bg`) in a late layer always win
without escalating a single selector, which is exactly what flat,
composable classes need. Gotchas: unlayered CSS beats ALL layered CSS
(normal declarations), so pull third-party stylesheets into a layer with
`@import url(vendor.css) layer(vendor);`; and `!important` REVERSES layer
order (earlier layers win).
`:where()` Baseline since 2021; `@layer` since 2022.
When the old way is still fine: if you must support pre-2022 browsers,
skip both. They drop the entire `@layer { ... }` block, and a rule using
`:where()` too, rather than degrading gracefully.

## 11. Sass nesting, scattered breakpoints → native CSS nesting

```css
/* old: the desktop layout and its collapse rules live in different
   places, so the collapse pass is the thing that gets forgotten */
.cards { display: grid; gap: 1rem; grid-template-columns: repeat(4, 1fr); }
/* ...200 lines later... */
@media (max-width: 60em) { .cards { grid-template-columns: 1fr 1fr; } }
@media (max-width: 36em) { .cards { grid-template-columns: 1fr; } }
```

```css
/* new: no build step, and the layout carries its own collapse rules */
.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(4, 1fr);

  @media (max-width: 60em) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 36em) { grid-template-columns: 1fr; }

  & > :focus-within { outline: 0.2rem solid currentColor; }
}
```

This is the use that earns its keep: `@media` and `@container` nested inside
the rule they modify, so desktop-first development (pair 4) keeps each
reduction next to the layout it reduces. The collapse pass stops being a
separate chore, and a reviewer sees at a glance that it exists.
Gotchas: `&` behaves like `:is()`, so a nested selector takes the HIGHEST
specificity in the parent's selector list; keep nesting two levels deep at
most, because deep nesting mirrors the DOM and inflates specificity (pair
10). Native nesting cannot concatenate suffixes, so `&__title` and
`&--dark` do nothing: you cannot write BEM with it, which is just as well.
Use flat, single-purpose classes.
Baseline since 2023 (Baseline widely available in 2026).
When the old way is still fine: if a Sass build already exists and you
cannot drop it, keep it. But a project adding Sass ONLY for nesting is
carrying a toolchain for a feature the browser now has.

## 12. Physical properties → logical properties

```css
/* old: physical sides, wrong the day the page is RTL or vertical */
.note { padding: 1rem 0 0 1rem; margin: 0 auto; width: 100%; max-width: 40rem; }
```

```css
/* new */
.note {
  padding-block: 1rem 0;     /* start, end */
  padding-inline: 1rem 0;
  margin-inline: auto;
  inline-size: 100%;
  max-inline-size: 40rem;
}
```

Logical by default. But never spell it with six longhands:
`padding-block-start` plus `padding-inline-start` loses to the physical
shorthand on pure typing, and rightly so. The paired shorthands
(`padding-block`, `padding-inline`, `margin-inline`, `inset-inline`) cost
one extra declaration and keep the page correct in Arabic, Hebrew and
vertical writing modes. Differences to know: `margin-inline: auto` leaves
the block margins alone, `margin: 0 auto` zeroes them; `box-shadow`,
`background-position` and `transform` have no logical form and stay
physical.
Baseline since 2021 (widely available since 2024).
When the old way is still fine: a project that is, and will stay,
LTR and horizontal-only. Then the 4-value physical shorthand is a defensible
shortcut. Decide per project and write it down.

## 13. Manual line breaks and balance scripts → text-wrap

```html
<!-- old: presentational markup that breaks at every other viewport -->
<h1>Responsive design is<br>not a breakpoint list</h1>
```

```css
/* new: once, in the base layer */
h1, h2, h3, h4, h5, h6, figcaption { text-wrap: balance; }
p { text-wrap: pretty; }
```

`balance` evens out the line lengths of short blocks, so a headline stops
ending in one orphaned word. Browsers cap it at a handful of lines
(Chromium 6, Firefox 10), which is why it belongs on headings and captions,
never on body copy. `pretty` avoids orphans in paragraphs at some layout
cost. Unsupported browsers ignore both declarations: pure progressive
enhancement, no fallback needed.
`balance` Baseline newly available since 2024 (Chrome 114, Firefox 121,
Safari 17.5); `pretty` is NOT Baseline yet (Chrome 117, Safari 26, no
Firefox), which is fine for an enhancement.
When the old way is still fine: a deliberate poetic or code-like break
belongs in markup. Everything else is the browser's job.

## 14. Modifier classes and JS state classes → :has()

```html
<!-- old: markup carries the state -->
<article class="card card-with-image">…
```

```css
/* old */
.card-with-image { display: grid; grid-template-columns: 12rem 1fr; }
/* plus JS: body.classList.toggle('modal-open') to lock scroll */
body.modal-open { overflow: hidden; }
```

```css
/* new: CSS reacts to the content that is actually there */
.card:has(> img) { display: grid; grid-template-columns: 12rem 1fr; gap: 1rem; }
body:has(dialog[open]) { overflow: hidden; }
```

The parent selector that CSS lacked for twenty years. The markup says
what the thing IS, the stylesheet decides what that means (doctrine 2),
and the card cannot get out of sync with its own contents. Scroll lock for
a modal needs no script at all. It also reaches what was impossible before:
styling the previous sibling (`label:has(+ input:required)`) and counting
children (`ul:has(li:nth-child(4))`).
Gotchas: keep it scoped and use the child combinator where you can,
`.card:has(> img)` is cheap, `:has(img)` or `body *:has(...)` makes the
browser re-check the whole subtree on every DOM change. No `:has()` inside
`:has()`, no pseudo-elements in its argument, and its specificity is that of
its most specific argument (pair 10). Browsers without it drop the whole
rule, so the default (unmatched) state must already be acceptable.
Baseline since 2023 (widely available in 2026).
When the old way is still fine: never for the card pattern. If you control
the markup and it must work in a pre-2023 browser, a plain class is the
fallback.

## 15. Decorative `<img>` → CSS background (the URL as data when the CMS supplies it)

The test: delete the image. Does the page still say the same thing? Yes,
it is decoration: CSS background. No, it is content: `<img>` with a real
`alt`, always.

```html
<!-- old: decoration living in the markup, one file for every screen -->
<section class="productCard">
  <img src="/fileadmin/perfume-large.jpg" alt="" class="productCard-img">
  <header><span>Perfume</span> <h2>Gabrielle Essence</h2></header>
  …
</section>
```

```html
<!-- new: only the per-instance URLs (data) travel in the markup -->
<section class="productCard"
  style="--img-large: url('/fileadmin/perfume-large.jpg'); --img-small: url('/fileadmin/perfume-small.jpg')">
  <header><span>Perfume</span> <h2>Gabrielle Essence</h2></header>
  …
</section>
```

```css
.productCard {
  background-color: #f4f4f4;               /* text stays legible if the image fails */
  background-image: var(--img-large, none); /* the fallback keeps a missing property harmless */
  background-repeat: no-repeat;
  background-position: left center;
  background-size: auto 100%;
  padding-inline-start: 40%;               /* room for the side image */

  @media (max-width: 40em) {
    background-image: none;                /* the large file is not needed here */
    padding-inline-start: 1.5rem;
    text-align: center;
  }

  & header::after {
    content: "";
    display: none;
    inline-size: 8em;
    block-size: 8em;
    margin: 1rem auto 0;
    background: var(--img-small, none) center / contain no-repeat;

    @media (max-width: 40em) { display: block; }
  }
}
```

The same pattern comes from Jason Knight's product-card rewrite ("The
/FAIL/ Of Tailwind, The Go-To For The Ignorant", Medium/CodeX, with a demo
under `cutcodedown.com/for_others/medium_articles/productCards/`, which was
unreachable when I checked). His card carries two image URLs as custom
properties in the card's `style` attribute, shows the large one as a side
background on wide screens, and on narrow ones swaps it for a small fixed-
size image generated after the heading. He calls that style attribute an
exception to his usual rule against them: the markup is the right place to
decide which images a card carries, and the stylesheet decides everything
about how they look. The images are not forced on user agents that do not
care, and moving or removing one is an edit to the markup, not to the CSS.
Static decoration has no per-instance URL, so it goes straight into the
stylesheet: his cart icon is a stylesheet `:before`, which also caches
across pages, and the icon cards in his "Blinder" rewrite carry no `<img>`
at all.

Why `--img-large` and not `style="background-image: url(…)"`: an inline
declaration beats every stylesheet rule except `!important`, so a media
query can no longer switch the image off. With custom properties the
stylesheet stays in charge, and a screen that does not use an image
generally never downloads it. The literal inline form works, and beats an
`<img alt="">`, but you lose that control.

Is a product photo decoration? It passes the delete test only when the
heading and text already carry the meaning, as in his card (name,
description, price). In a shop where the photo itself informs the purchase
(colour, size, variants), it is content: use `<img>` with a real `alt`.
That call belongs to the project, not to the pattern.

Gotchas:
- NEVER for content. A background has no `alt`, assistive technology
  ignores it, it does not print by default and reader modes drop it.
- `<img alt="">` is valid and accessible (WCAG technique H67). The case
  against it is that it is presentation in the markup: CSS cannot drop,
  swap or resize it by media query, and it still downloads under
  `display: none`.
- Write `var(--img-large, none)` with a fallback. Used inside a shorthand
  such as `background:`, an undefined custom property makes the whole
  declaration invalid, not just the image.
- No `loading="lazy"` and no `srcset` on a background (use `image-set()`
  for densities; Baseline 2023), and the preload scanner does not find a
  `url()` in a style attribute. A large above-the-fold image needs
  `<link rel="preload" as="image">`. If it is that important to the page,
  ask whether it is decoration at all.
- Check the contrast of text against the WORST part of the image, and
  always set a `background-color`: an unloaded image must not make the
  text unreadable.
- The URL must come from the system (the file's public URL), never from
  editor-typed text. A quote or `)` ends the CSS value and lets injected
  declarations in, and HTML-escaping the attribute does not stop that.
- A strict CSP blocks `style` attributes unless `style-src-attr` allows
  them. Decide that up front.
- Keep this exception narrow: per-instance image URLs only. Every other
  style belongs in the stylesheet, where it is cached across pages.
`background-image` and custom properties have been Baseline for years
(2015 and 2017).
When the old way is still fine: a decorative image that is also the
page's largest above-the-fold element and must be discovered early. An
`<img alt="" fetchpriority="high">` is the honest choice there, and the
rule above still says why.

## What a resized desktop window will not show you

Test on a real device before "done":

- Touch targets: 44×44px is the long-standing platform guideline
  (Apple HIG); WCAG 2.2 AA minimum is 24×24 CSS px.
- Hover-only menus and tooltips with no keyboard/touch path.
- `100vh` overflow/underlap and jumpy chrome (pair 6).
- Safe-area insets on notched phones, portrait AND landscape.
- Real-DPR images: does that 1x asset hold up at 2x/3x?
- 200% text zoom and enlarged system font — the rem cascade must
  survive it (doctrine 4).

## Sources

- [modern.css](https://modern-css.com) — the old-hack → modern-CSS
  format, with browser support per snippet.
- [moderncss.dev](https://moderncss.dev) — Stephanie Eckles, "Modern
  CSS Solutions for Old CSS Problems" (long-form).
- [smolcss.dev](https://smolcss.dev) — minimal modern layout snippets.
