# Measuring a front-end: method and yardsticks

Neutral companion to the "Count the real bytes" step of the review. Based
on Jason Knight, "Testing Website Speed And Quality" (Medium/CodeX, May
2024), paraphrased. The numbers are his rules of thumb, not standards, and
the file says so wherever it matters. Measure; do not recite.

## Method

1. **Tool scores are a starting point, not evidence.** Use Lighthouse or
   PageSpeed to find things to fix. Never put their performance score in a
   finding. Lighthouse leans on render metrics, undervalues file count and
   size, and runs on the reviewer's own fast connection. His example: a
   template of 615 KB in 26 files and his rewrite at about a fifth of the
   transfer and a quarter of the files scored almost the same.
2. **Use a real browser, a cache-empty reload and the network waterfall**
   (Ctrl+F5). Use both engines: Firefox shows real AND transferred size per
   file, Chromium shows transferred size (his observation). The tooling
   differs, and so do the findings.
3. **Throttle.** Add a custom profile of 2 Mbit/s down, 512 kbit/s up and
   200 ms latency. Chromium's throttling is dependable. He reports that
   Firefox's sometimes fails to reload subresources (a 2024 observation,
   not re-checked).
4. **Report:** request count, real bytes, transferred bytes,
   DOMContentLoaded and load, and the markup/CSS/JS split against the
   content bytes. Watch for scripts that run after load and force a reflow.
5. **Read view-source, not the inspector.** The inspector shows the DOM.
   For the plain-text size, select the page text, paste it into a flat text
   editor and count.
6. **Your own connection is not representative.** "Fast for me" is not a
   measurement.

## Yardsticks (rules of thumb)

**HTML.** Expected bytes of markup are about:

`2048 + 1.5 × plain text + links × L + form controls × 128 + media × M`

- links include buttons doing a link's job; form controls are `input`,
  `select`, `textarea` and `option`; media are `img`, `video` and `audio`.
- His text gives L = 192 and M = 256 as generous guesses, but his worked
  example only reproduces with L = 96 and M = 128. Use the range: L from 96
  to 192, M from 128 to 256.
- More than 50% over the ceiling: the page has problems. Double or more:
  the build is wrong.
- Worked example (his): a page of 888 bytes of text, 20 links and one image
  should be about 5.4 to 7.5 KB. The Bootstrap pricing example measured 17.3
  KB, and his rewrite 5.5 KB.
- A true web app: 4 KB of HTML, flat. Only the head loads, the script loads
  and a `<noscript>` warning belong in the markup. If the markup works only
  with scripting, build it in the scripting.

**CSS.** About 20 KB for a single page is normal. For a whole site, at most
48 KB per media target in one or two files for screen and 32 KB for print,
80 KB in total across three or four files.

**Files.** More than eight files of HTML, CSS and JS on a normal site, or
24 on a true web application, is a smell. His per-file penalty figures (200
ms per file past the eighth, "48 files = 8 to 40 seconds") come from a
connection model that predates HTTP/2 multiplexing, so treat the file count
as a heuristic and confirm it in the waterfall. Both extremes lose: one
file for everything means shared styles and images are not cached across
pages and files do not load in parallel, while dozens of tiny files pay the
per-file overhead.

**Render time.** When rendering is slow, the usual causes are too many DOM
elements, too many CSS rules, too much JavaScript, and too many separate
files, since rendering waits for the load. Look there before blaming CSS.

## Not carried over

- **Bounce statistics.** His percentages by seconds are unsourced in the
  article. Do not repeat them.
- **HTTP/2 push.** Chrome 106 disabled it by default, Firefox 132 removed
  it and nginx dropped it in 1.25.1. `<link rel="preload">` still works
  (Baseline since 2021); 103 Early Hints is the successor to push. Keep
  preload to a handful of files: the screen CSS, a few scripts and
  webfonts.
- **Audience, not fashion.** His AVIF-versus-PNG anecdote is about a
  medical client on legacy hardware. Judge format choices against the real
  audience, as the review already does.

## `<style>` in static markup

The "above the fold CSS" advice trades away the caching of style shared
across pages and delays parallel loading, for the sake of a faster
cache-empty first load. A `<style>` block in static markup is the same sin
as presentational classes: presentation in the markup. Adding it from
script after load, for script-only style, is fine. This agrees with
`deathshadow/references/responsive-workflow.md`, pair 15: the one
legitimate style attribute carries per-instance data (an image URL), not
presentation.
